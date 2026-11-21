import { slugify, slugSuffix } from "../../src/utils/slugify";

describe("slugify", () => {
  it.each([
    ["Hello World", "hello-world"],
    ["Hello, Wörld! My First Post", "hello-world-my-first-post"],
    ["  --Leading and trailing--  ", "leading-and-trailing"],
    ["Multiple   spaces & symbols!!", "multiple-spaces-symbols"],
    ["Café crème brûlée", "cafe-creme-brulee"],
    ["2026 Year In Review", "2026-year-in-review"],
  ])("%j -> %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("falls back to 'post' when nothing usable remains", () => {
    expect(slugify("!!! ???")).toBe("post");
    expect(slugify("日本語")).toBe("post");
  });

  it("caps the length at 80 characters without a trailing dash", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("slugSuffix", () => {
  it("returns 6 random hex characters", () => {
    expect(slugSuffix()).toMatch(/^[0-9a-f]{6}$/);
    expect(slugSuffix()).not.toBe(slugSuffix());
  });
});
