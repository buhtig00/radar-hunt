import { describe, it, expect } from "vitest";
import { chunkContent } from "./chunk";

describe("chunkContent", () => {
  it("returns an empty array for blank input", () => {
    expect(chunkContent("")).toEqual([]);
    expect(chunkContent("   \n  ")).toEqual([]);
  });

  it("returns a single chunk when the text already fits", () => {
    const text = "Educational note about keratoconus management.";
    expect(chunkContent(text, { maxChars: 1200 })).toEqual([text]);
  });

  it("splits long text into several bounded chunks", () => {
    const sentence = "Esta es una frase clinica de ejemplo sobre la patologia. ";
    const text = sentence.repeat(40); // ~2200 chars
    const chunks = chunkContent(text, { maxChars: 200, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeGreaterThan(0);
      // never wildly above the window (allow overlap + one sentence slack)
      expect(c.length).toBeLessThanOrEqual(200 + 20 + sentence.length);
    }
  });

  it("hard-splits a single oversized unit", () => {
    const huge = "x".repeat(900);
    const chunks = chunkContent(huge, { maxChars: 300, overlap: 30 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 300)).toBe(true);
  });
});
