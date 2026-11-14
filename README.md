# Diwar-e-Faiz (دیوارِ فیض)

**Your Extra Can Be Someone's Blessing.**
آپ کی اضافی چیز، کسی کی ضرورت پوری کر سکتی ہے۔

A community donation platform: people list items they no longer need (clothes, books, furniture, electronics) and people nearby request them. **Every item is free — there is no price field anywhere in the system.**

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Proxy) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (tokens in `src/app/globals.css`) |
| Backend | Firebase Authentication, Cloud Firestore, Cloud Storage; Firebase Admin SDK on the server |
| Validation | zod (shared schemas, always re-checked on the server) |
| Tests | Vitest (unit), Firebase emulators (auth e2e, Firestore integration) |

## 1. Firebase setup (one-time, in the Firebase console)

1. **Create a project** at https://console.firebase.google.com.
2. **Add a Web app** (Project settings → General → Your apps → `</>`). Copy the config values.
3. **Authentication** → Get started → Sign-in method → enable **Email/Password** and **Google**.
   Under Settings → Authorized domains, add your production domain (localhost is there by default).
4. **Firestore Database** → Create database → **production mode** → location **`asia-south1` (Mumbai)**
   (there is no Pakistan region; Mumbai is closest. The location can't be changed later).
5. **Storage** → Get started (requires the **Blaze** pay-as-you-go plan; the free tier still applies).
6. **Service account**: Project settings → Service accounts → **Generate new private key**. Keep the JSON secret.

## 2. Local setup

Requires Node.js 20.9+ (developed on 22) and npm 10+.

```bash
npm install
cp .env.example .env.local      # fill in the 6 web values + 3 service-account values
npx firebase login              # once, to deploy rules
npx firebase use --add          # pick your project
npm run firebase:deploy-rules   # Firestore rules + indexes, Storage rules
npm run firebase:seed           # categories + success stories (add -- --demo for sample listings)
npm run firebase:check          # verifies every credential and service, with fix-it hints
npm run dev                     # http://localhost:3000
```

Make yourself an admin (needed to approve listings): `npm run admin:grant -- you@example.com`

### Environment variables

| Variable | Where it's used | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID` | Browser SDK | No — public identifiers; data is protected by rules |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Admin SDK (server only) | **Yes** — never prefix with `NEXT_PUBLIC_` |
| `FIREBASE_STORAGE_BUCKET` | Admin SDK (optional) | No |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` / `lint` / `typecheck` | Usual Next.js workflow |
| `npm test` | Unit tests (validation, search, auth helpers) |
| `npm run test:auth` | Auth e2e against the Auth emulator + running app (see Testing) |
| `npm run test:integration` | Discovery tests against the Firestore emulator + running app |
| `npm run firebase:check` | Connectivity check for every Firebase service |
| `npm run firebase:seed [-- --demo \| --remove-demo]` | Seed categories/stories, optional demo listings, recount category totals |
| `npm run firebase:deploy-rules` | Deploy `firestore.rules`, `firestore.indexes.json`, `storage.rules` |
| `npm run admin:grant -- <email>` / `admin:revoke` | Set/remove the `admin` custom claim |
| `npm run admin:moderate -- list \| approve <id> \| reject <id> "reason"` | Review pending listings |

## Architecture

```
src/
├── app/                 Routes only (pages, layouts, route handlers)
│   ├── donations/       Browse (/donations) + details (/donations/[id])
│   ├── users/[uid]/     Donor public profile
│   ├── donate/          Create listing          (protected)
│   ├── my-donations/    Dashboard + edit        (protected)
│   ├── profile/         Profile + first-time setup (protected)
│   ├── login/ register/ forgot-password/
│   └── api/auth/session Session cookie endpoint
├── components/          ui/ primitives, layout/ (navbar, footer), providers/ (auth, toast)
├── features/            Domain UI: auth, donate, donations, my-donations, profile, home, contact
├── server/              SERVER ONLY (import "server-only")
│   ├── actions/         Server actions — every write goes through here
│   ├── auth/session.ts  Session cookie create/verify, requireUser/requireAdmin
│   ├── db/              Firestore readers (public.ts is cached; donations/users are owner-scoped)
│   ├── firebase/admin.ts  Admin SDK
│   └── cache-tags.ts    Cache invalidation after writes
├── lib/                 firebase client, zod schemas, search helpers, utils, errors
├── constants/           Site info, routes, cities, categories
├── types/               Domain + Firestore document types
└── proxy.ts             Optimistic redirect to /login for protected routes
```

### Security model

- **Clients never write to Firestore.** `firestore.rules` only grants *reads*; every write is a server action that
  verifies the httpOnly session cookie, validates input with zod, checks ownership inside a transaction and writes with the Admin SDK.
- **Uploads** go straight to Storage; `storage.rules` restricts them to the owner's folder, images only,
  ≤ 5 MB (listings, verified email required) / ≤ 2 MB (avatars). The server re-checks every file before referencing it.
- **Private data** (email, phone) lives in `users/{uid}/private/profile`, readable only by its owner. Public pages read
  explicit public fields only.
- **Admin rights** are a custom claim set by a CLI script — there is no admin code path in the browser.
- **Sessions**: Firebase ID token → 5-day httpOnly `__session` cookie (same-origin POST only), revocation checked on every request.

### Data model (Firestore)

| Collection | Purpose |
| --- | --- |
| `users/{uid}` (+ `private/profile`, `notifications/*`) | Public profile; private contact data; notifications |
| `donations/{id}` | Listing: details, images, `status` (available/reserved/given/removed), `moderation` (pending/approved/rejected), search `keywords` |
| `applications/{donationId}_{uid}` | Requests (one per person per item) |
| `conversations/{applicationId}` (+ `messages/*`) | Opened when a request is accepted |
| `categories/{slug}` | Fixed taxonomy + live item counts |
| `reports/*`, `successStories/*` | Moderation reports; published stories |

### Discovery

Browse shows only **approved + available** listings, newest first, 12 per page with cursor-based **Load more**.
Search uses a `keywords` array (words + 3-letter prefixes); filters on category, city and condition are Firestore
`where` clauses backed by composite indexes for every combination. Public reads are cached (`use cache`) and expired
immediately by server actions after writes.

## Testing

```bash
npm test                     # unit tests, no Firebase needed
npm run test:rules           # Firestore + Storage security rules in the emulators (needs Java 11+)
```

**Auth e2e** (Auth emulator runs on Node — no Java needed):

```bash
npx firebase emulators:start --only auth --project demo-diwar-e-faiz
# in another terminal: build + start the app against the emulator
export NEXT_PUBLIC_FIREBASE_API_KEY=fake-api-key NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-diwar-e-faiz.firebaseapp.com \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-diwar-e-faiz NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-diwar-e-faiz.appspot.com \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1 NEXT_PUBLIC_FIREBASE_APP_ID=1:1:web:1 NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true \
  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIREBASE_PROJECT_ID=demo-diwar-e-faiz FIREBASE_STORAGE_BUCKET=demo-diwar-e-faiz.appspot.com
npm run build && npx next start -p 3100
npm run test:auth            # with FIREBASE_AUTH_EMULATOR_HOST set
```

**Discovery integration** needs the Firestore emulator (**Java 11+**): start emulators with
`--only auth,firestore,storage`, add `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and
`FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199` to the env above, then `npm run test:integration`.

Remember to rebuild without the emulator variables before deploying.
