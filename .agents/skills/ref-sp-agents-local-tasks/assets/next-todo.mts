// Print the first open item in .agents/local/tasks/TODO.md. Copy to .agents/local/playground/ to use.

import { existsSync, readFileSync } from 'node:fs';

type TodoItem = {
  lineNumber: number;
  text: string;
};

const todoPath = '.agents/local/tasks/TODO.md';
const legacyTodoPath = '.agents/tasks/TODO.md';
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
  if (!existsSync(todoPath)) {
    console.error(
      existsSync(legacyTodoPath) ?
        `No ${todoPath}, but ${legacyTodoPath} exists: this repo still uses the old layout. Run tool-sp-migrate-agent-repo.`
      : `No ${todoPath}. Create it (ref-sp-agents-local-tasks), or if the tasks are still under .agents/tasks/, run tool-sp-migrate-agent-repo.`,
    );
    process.exitCode = 1;
    return;
  }

  const todoItem = findNextTodo(readFileSync(todoPath, 'utf8'));
  if (!todoItem) {
    console.log('No open todos found.');
    return;
  }

  console.log(`${todoPath}:${todoItem.lineNumber}: ${todoItem.text}`);
};

main();
