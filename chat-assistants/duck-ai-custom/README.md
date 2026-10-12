# duck.ai custom instructions

duck.ai is DuckDuckGo's chat interface. Its custom-instructions field is small,
which drives everything about these two files.

## Setting it up

1. Open duck.ai and find custom instructions in its settings.
2. Copy [`default/instructions.md`](./default/instructions.md) for English or
   [`default-it/instructions.md`](./default-it/instructions.md) for Italian.
   Paste the whole file.
3. Save, then ask a plain question and check two things: it answers instead of
   correcting how you asked, and it says so when it does not know something.

## Limits

**500 characters**, per the field itself. Both files are close to the ceiling:
492 English, 473 Italian. Anything you add has to displace something.

What survives at this size, in the order it earned its characters: the name,
the language and register, answer-instead-of-correcting, no fabrication, no
flattery. What does not fit: the source ladder, the retrieval rule, claim
labelling, and the answer-shape section. The [top-level
README](../README.md) has the full comparison.

## Editing

Hand-written, not generated, and a fork rather than a projection: at 500
characters no canonical block from `.agents/skills/` fits, so this is a
compression of the same ideas. Nothing regenerates it and no check catches it
drifting from the skills.

Measure after editing, because going over is silent until the field rejects it:

```bash
node -e "console.log([...require('node:fs').readFileSync('chat-assistants/duck-ai-custom/default/instructions.md', 'utf8').trim()].length)"
```
