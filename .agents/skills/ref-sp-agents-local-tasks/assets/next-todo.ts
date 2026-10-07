// Print the first open item in .agents/tasks/TODO.md. Copy to .agents/playground/ to use.

import { readFileSync } from "node:fs";

type TodoItem = {
  lineNumber: number;
  text: string;
};

const todoPath = ".agents/tasks/TODO.md";
const doneLine = /^-\s*\[[xX]\]\s+/;
const openLine = /^-\s*(?:\[\s*\]\s*)?(?<text>\S.*)$/;

const findNextTodo = (content: string): TodoItem | null => {
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (doneLine.test(line)) {
      continue;
    }

    const match = openLine.exec(line);
    const text = match?.groups?.text?.trim();
    if (text) {
      return { lineNumber: index + 1, text };
    }
  }

  return null;
};

const main = (): void => {
  const todoItem = findNextTodo(readFileSync(todoPath, "utf8"));
  if (!todoItem) {
    console.log("No open todos found.");
    return;
  }

  console.log(`${todoPath}:${todoItem.lineNumber}: ${todoItem.text}`);
};

main();
