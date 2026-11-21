---
name: ref-sp-agents-user-communication
description: "How an agent puts questions and proposed edits to the user: numbered questions with CTX, ASK, and SGG lines, lettered options, quoted text with the words in question marked, and Current/Proposed pairs for edits. Use when asking the user anything beyond a single yes/no, or proposing a change to text."
license: MIT
metadata:
  shareable-skills.owner-prefix: "sp"
  shareable-skills.owner: "swiftpostlabs/agentic-tools"
  shareable-skills.domain: "agents"
  shareable-skills.tags: "communication, working-style"
  shareable-skills.visibility: "public"
  shareable-skills.suggests: "ref-sp-agents-mr-wolf-persona, ref-sp-agents-local-tasks"
---

# User Communication

How to write to the user so they can follow and answer quickly, by reference: in chat, in a task
brief, or in a board message the user reads. The agent's voice and when to push
back is `ref-sp-agents-mr-wolf-persona`; messages between agent sessions are
`ref-sp-agents-cross-session-communication`.

## Questions

- **Check first.** Look where answers land (earlier in the conversation, the task brief, a board's
  chat and decisions) and never ask again what is already settled.
- **Number them as a plain list**, `1.`, `2.`, and so on, so the user can reply "1. yes, 2. B"
  without typing a prefix. Numbers are permanent: never renumber or reuse one. A new question takes
  the next unused number, even after earlier ones are answered.
- **Give each these lines, labels in bold:**
  - **CTX** the context in plain words: what it is about and what depends on the answer.
  - **ASK** the question. Letter the options `A`, `B`, `C`, and so on, as many as there really are:
    two is fine, and so is five. "2. B" is then a complete answer.
  - **SGG** the default you apply if no answer comes, so work can go on. It may combine options:
    "A, with a hint of B", "B now, A later". Suggest only on real ground: evidence, a convention,
    or something the user said. When the information isn't there, leave **SGG** out and the
    question waits for its answer; a guessed default reads as a recommendation.
- **Describe every cross-reference:** "4 (amount and duration)", never a bare "4" or "4b".
- A single yes/no question needs none of this; ask it plainly. A design discussion the user wants
  to reason through stays open prose with concrete examples. The format is for decisions.

```md
3. **What was agreed with the client**
   - **CTX** The contract decides who the counterparty is and whether the invoice needs F-skatt.
   - **ASK** Is there a written contract? A: yes, it requires F-skatt. B: yes, it doesn't. C: no.
   - **SGG** C, an informal agreement where the client expects an invoice.
```

Markdown renumbers a list from its first item, so once earlier questions are answered and the
numbers have gaps (`3.` then `5.`), the second would render as 4. Start each such question as its
own list, with a line of text between them, so every number shows as written.

## Questions about text

When a question is about wording, quote the passage as a blockquote and mark the words in question
in bold italic, so the user sees what you mean without opening the file:

```md
> The smiths wear ***thin*** clothes.

What do you mean by clothes here?
```

Within a numbered question, the quote goes in **CTX**.

## Proposed edits

Frame every proposed change as a **Current** and **Proposed** pair of quotes, marking what changes
in bold italic in both:

```md
**Current**
> Run the tests ***before every push***.

**Proposed**
> Run the tests ***before every commit***.
```

- Quote enough surrounding text to find the passage, and no more.
- One pair per edit. Several edits to one paragraph are one pair with several marks.
- When the edit is part of a question set, the pair goes in **CTX** and **ASK** offers the choice
  ("A: apply. B: keep current. C: something else").

