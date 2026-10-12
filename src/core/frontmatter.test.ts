import { describe, expect, test } from "@jest/globals";
import { parseFrontmatter, stripFrontmatter } from "./frontmatter.ts";

describe("parseFrontmatter", () => {
  test("reads scalars and flattens nested metadata keys with a dotted prefix", () => {
    const fields = parseFrontmatter(
      ['---', 'name: demo', 'description: "Quoted: value"', "metadata:", '  shareable-skills.visibility: "public"', "  owner: 'me'", "---", "body"].join("\n"),
    );
    expect(Object.fromEntries(fields)).toEqual({
      name: "demo",
      description: "Quoted: value",
      "metadata.shareable-skills.visibility": "public",
      "metadata.owner": "me",
    });
  });

  test("rejects a missing opening delimiter", () => {
    expect(() => parseFrontmatter("name: demo\n")).toThrow("missing YAML frontmatter");
  });

  test("rejects a missing closing delimiter", () => {
    expect(() => parseFrontmatter("---\nname: demo\n")).toThrow("closing frontmatter delimiter");
  });

  test("skips comments and blank lines", () => {
    expect(Object.fromEntries(parseFrontmatter("---\n# note\n\nname: demo\n---\n"))).toEqual({ name: "demo" });
  });
});

test("stripFrontmatter returns the body after the block", () => {
  expect(stripFrontmatter("---\nname: x\n---\nbody\n")).toBe("body\n");
  expect(stripFrontmatter("no frontmatter")).toBe("no frontmatter");
});
