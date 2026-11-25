---
name: ref-sp-agents-user-communication
description: "How an agent writes to the user: numbered questions with CTX, ASK, and SGG lines and lettered options when there are any, quoted text with the words in question marked, Current/Proposed pairs for edits, and a short title beside every code such as a commit SHA or PR number. Use when asking the user anything beyond a single yes/no, proposing a change to text, or citing a commit, PR, issue, or ID."
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
  without typing a prefix. Within a topic, numbers are permanent: never renumber or reuse one. A
  new question takes the next unused number, even after earlier ones are answered.
- **Restart at 1 for a new topic,** once every question of the current one is settled. A topic is
  a piece of work the user handles on its own, such as the next application, document, or task;
  the next question about the same thing is not a new topic. Open the new block with a line naming
  the topic ("**Hero application**"), and refer back to an earlier block by topic and number, with
  its description: "IKEA 3 (relocation)". While any question is still open, keep counting.
- **Give each these lines, labels in bold:**
  - **CTX** the context in plain words: what it is about and what depends on the answer.
  - **ASK** the question. Offer options only when the answer is a choice among known alternatives;
    an open question ("What did the client say?") has none. When there are options, put each on
    its own line under **ASK**, lettered in order: as many as there really are, two is fine and
    so is five. "2. B" is then a complete answer.
  - **SGG** the default you apply if no answer comes, so work can go on. It may combine options:
    "A, with a hint of B", "B now, A later". Suggest only on real ground: evidence, a convention,
    or something the user said. When the information isn't there, leave **SGG** out and the
    question waits for its answer; a guessed default reads as a recommendation.
- **Describe every cross-reference:** "4 (amount and duration)", never a bare "4" or "4b".
- **One at a time, when the user works that way.** If the user asks to take questions one at a
  time, or clearly does so by answering one and discussing it, raise the next only once the current
  one is clearly settled. If you can't tell whether it is, ask that rather than moving on.
  - Not settled yet: the user's answer goes beyond the offered options (a new idea, a mix you didn't
    propose), or you need a follow-up or clarifying question about it. Settle that first.
  - Ready for the next: neither of those remains. Other context can still say otherwise, such as
    the user saying they want to think it over.
- A single yes/no question needs none of this; ask it plainly. A design discussion the user wants
  to reason through stays open prose with concrete examples. The format is for decisions.

```md
3. **What was agreed with the client**
   - **CTX** The contract decides who the counterparty is and whether the invoice needs F-skatt.
   - **ASK** Is there a written contract?
     - **A** Yes, and it requires F-skatt.
     - **B** Yes, and it doesn't.
     - **C** No.
   - **SGG** C, an informal agreement where the client expects an invoice.
4. **Where the invoice goes**
   - **CTX** The client's finance team may use a portal instead of email.
   - **ASK** Which address or portal did the client give for invoices?
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
- When the edit is part of a question set, the pair goes in **CTX** and **ASK** offers the choice,
  one option per line: **A** apply, **B** keep current.

## Codes

Agents recall a commit SHA, a PR or issue number, a ticket or run ID at a glance; people don't.
Give every code a short title of what it names, every time it appears:

- "`2450c75` (support exceptions in protected files)", not a bare "`2450c75`".
- "PR #40 (dev-dependency bump)", "issue #12 (login loop on Safari)", "run 8812 (nightly tests)".
- In a list of commits, the subject line is the title: `757d358 feat(skills): Add …`.

A link doesn't replace the title: the user still has to open it to know what it is.
