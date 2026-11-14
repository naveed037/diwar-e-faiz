import { describe, expect, it } from "vitest";
import { parseBrowseFilters } from "@/lib/validation/browse";
import { buildKeywords, matchesRest, planSearch, tokenize } from "@/lib/search";

describe("tokenize", () => {
  it("lower-cases, strips punctuation and accents, drops 1-char tokens", () => {
    expect(tokenize("Dell Laptop — Core i5, 8 GB!")).toEqual(["dell", "laptop", "core", "i5", "gb"]);
    expect(tokenize("Café")).toEqual(["cafe"]);
  });

  it("keeps Urdu words", () => {
    expect(tokenize("کتابیں اور کپڑے")).toEqual(["کتابیں", "اور", "کپڑے"]);
  });
});

describe("buildKeywords", () => {
  const kw = buildKeywords({ title: "Three-seater leather sofa", categoryId: "furniture", city: "Karachi", area: "Gulshan-e-Iqbal" });

  it("includes full words from title, category, city and area", () => {
    for (const w of ["three", "seater", "leather", "sofa", "furniture", "karachi", "gulshan", "iqbal"]) expect(kw).toContain(w);
  });

  it("includes 3+ character prefixes of title words for type-ahead search", () => {
    expect(kw).toEqual(expect.arrayContaining(["sof", "lea", "leat", "seat"]));
    expect(kw).not.toContain("so");
  });

  it("has no duplicates and stays bounded", () => {
    expect(new Set(kw).size).toBe(kw.length);
    const long = buildKeywords({ title: "a".repeat(10) + " " + "word ".repeat(200), categoryId: "books", city: "Lahore", area: "x" });
    expect(long.length).toBeLessThanOrEqual(120);
  });
});

describe("planSearch", () => {
  it("uses the longest token in Firestore and checks the rest in memory", () => {
    expect(planSearch("winter jackets kids")).toEqual({ primary: "jackets", rest: ["winter", "kids"] });
    expect(planSearch("  ")).toEqual({ primary: null, rest: [] });
    expect(planSearch(undefined)).toEqual({ primary: null, rest: [] });
  });

  it("matches remaining tokens as word prefixes", () => {
    expect(matchesRest(["win", "kid"], "Winter jackets for kids")).toBe(true);
    expect(matchesRest(["adult"], "Winter jackets for kids")).toBe(false);
    expect(matchesRest([], "anything")).toBe(true);
  });
});

describe("parseBrowseFilters (untrusted URL input)", () => {
  it("keeps valid filters", () => {
    expect(parseBrowseFilters({ q: " sofa ", category: "furniture", city: "Karachi", condition: "good" })).toEqual({
      q: "sofa",
      category: "furniture",
      city: "Karachi",
      condition: "good",
    });
  });

  it("silently drops invalid values instead of failing the page", () => {
    expect(parseBrowseFilters({ category: "weapons", city: "Atlantis", condition: "broken", q: "" })).toEqual({});
    expect(parseBrowseFilters({ q: "x".repeat(61) })).toEqual({});
  });

  it("uses the first value when a param is repeated", () => {
    expect(parseBrowseFilters({ city: ["Lahore", "Karachi"] })).toEqual({ city: "Lahore" });
  });
});
