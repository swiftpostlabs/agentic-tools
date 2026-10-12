# ChatGPT custom instructions

Custom instructions apply to every new ChatGPT conversation. They live in
settings, under personalisation, as two boxes: one about you, one about how
ChatGPT should respond.

## Setting it up

1. Open ChatGPT settings and find Custom instructions under personalisation.
2. Copy [`default/instructions.md`](./default/instructions.md) for English or
   [`default-it/instructions.md`](./default-it/instructions.md) for Italian into
   the box asking **how ChatGPT should respond**.
3. Leave the other box for who you are and what you work on. That is what it is
   for, and it is a separate budget.
4. Save, then check two things:
   - Ask **"what is your name?"** English answers Mr. Wolf, Italian answers Ettore.
   - Ask a plain question and watch that it answers rather than opening with a
     correction of how you asked it.

## Limits

**1,500 characters per box** is the long-standing figure, and both files fit
inside it: 1,484 English, 1,492 Italian.

Secondary sources claim OpenAI raised it to 5,000 on 15 July 2026. OpenAI's own
help page returns 403 to automated fetching, so that is uncorroborated by a
primary source and these files are written to the smaller number, which works
either way.

If your box does take more, the things worth restoring first, in order, are:
the four-tier source ladder from the
[Gem version](../gemini-gem/default/instructions.md), the line that your own
recall is a lead rather than a citation, and the no-preface rule on corrections
spelled out rather than compressed.

## Editing

Hand-written, not generated. These are compressions of the persona and
verification text from `.agents/skills/`, not verbatim copies, because no
canonical block fits in 1,500 characters. Nothing regenerates them, and no
check notices when the skills move on without them. Edit them directly, and
measure afterwards:

```bash
node -e "console.log([...require('node:fs').readFileSync('chat-assistants/chatgpt-custom/default/instructions.md', 'utf8').trim()].length)"
```
