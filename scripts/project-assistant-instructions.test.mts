import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "@jest/globals";
import { outputPath, render } from "./project-assistant-instructions.mts";

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

const tempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "assistants-"));
  roots.push(root);
  return root;
};

const write = (target: string, content: string): string => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
};

test("fills placeholders with the canonical blocks verbatim", () => {
  const root = tempRoot();
  write(
    path.join(root, "skills", "ref-sp-agents-mr-wolf-persona", "SKILL.md"),
    "---\nname: ref-sp-agents-mr-wolf-persona\n---\n## Canonical persona text\n\n```md\nBe direct.\n```\n",
  );
  const template = write(path.join(root, "gemini-gem", "templates", "default.template.md"), "# Gem\n\n{{PERSONA}}\n");
  expect(render(template, path.join(root, "skills"))).toBe("# Gem\n\nBe direct.\n");
});

test("rejects a placeholder the tool cannot fill", () => {
  const root = tempRoot();
  const template = write(path.join(root, "p", "templates", "x.template.md"), "{{UNKNOWN}}\n");
  expect(() => render(template, root)).toThrow("x.template.md still holds an unresolved placeholder");
  const missing = write(path.join(root, "p", "templates", "y.template.md"), "{{PERSONA}}\n");
  expect(() => render(missing, root)).toThrow("'ref-sp-agents-mr-wolf-persona' publishes no canonical block");
});

test("writes one folder per assistant beside the templates folder", () => {
  expect(outputPath("/a/gemini-gem/templates/default-it.template.md")).toBe("/a/gemini-gem/default-it/instructions.md");
});
