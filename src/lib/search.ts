/**
 * Keyword search on Firestore (which has no full-text search).
 *
 * At write time each listing stores `keywords`: lower-cased words from the title, category, city and area,
 * plus prefixes (3+ chars) of title words so "sof" matches "sofa" while someone is typing.
 * At query time the longest search token is matched with `array-contains`; the remaining tokens are
 * checked on the server against the listing text.
 */

const SPLIT = /[^a-z0-9؀-ۿ]+/;
const MAX_KEYWORDS = 120;

export function tokenize(text: string): string[] {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(SPLIT).filter((w) => w.length >= 2);
}

export function buildKeywords(input: { title: string; categoryId: string; city: string; area: string }): string[] {
  const titleWords = tokenize(input.title);
  const set = new Set<string>([...titleWords, ...tokenize(`${input.categoryId} ${input.city} ${input.area}`)]);
  for (const word of titleWords) {
    for (let i = 3; i < word.length; i++) set.add(word.slice(0, i));
  }
  return [...set].slice(0, MAX_KEYWORDS);
}

/** Splits a query into the token used in Firestore (longest) and the rest, which are checked in memory. */
export function planSearch(q: string | undefined): { primary: string | null; rest: string[] } {
  const tokens = [...new Set(tokenize(q ?? ""))].slice(0, 6);
  if (tokens.length === 0) return { primary: null, rest: [] };
  const primary = [...tokens].sort((a, b) => b.length - a.length)[0]!;
  return { primary, rest: tokens.filter((t) => t !== primary) };
}

/** True if every remaining token appears (as a word prefix) in the listing's text. */
export function matchesRest(rest: string[], text: string): boolean {
  if (rest.length === 0) return true;
  const words = tokenize(text);
  return rest.every((t) => words.some((w) => w.startsWith(t)));
}
