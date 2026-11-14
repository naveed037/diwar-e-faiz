// Loads .env.local (then .env) for CLI scripts, mirroring how Next.js loads env files.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
