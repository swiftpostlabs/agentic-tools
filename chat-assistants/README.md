# Chat assistants

Instruction text you paste into a consumer chat product (Gemini, ChatGPT,
duck.ai) so it behaves like the agents in this repo: direct, sourced, and
honest about what it does not know.

These are not skills. No agent working in this repository loads them. They are
finished text for a human to copy into a settings field somewhere else.

## Pick one

| Product | Field | English | Italian | Size |
| --- | --- | --- | --- | --- |
| [Gemini Gem](./gemini-gem/) | Gem instructions | `default/` | `default-it/` | ~10,500 chars |
| [ChatGPT](./chatgpt-custom/) | Custom instructions | `default/` | `default-it/` | ~1,500 chars |
| [duck.ai](./duck-ai-custom/) | Custom instructions | `default/` | `default-it/` | ~500 chars |

Each folder has a README with the setup steps for that product.

## Layout

```text
<product>/README.md              setup steps for a person
<product>/<assistant>/           one folder per assistant, one folder per Gem
<product>/templates/             sources for whatever is generated
```

One folder is one assistant, so a product whose assistant also needs uploaded
files has somewhere to keep them beside the instructions. None of the three here
uses knowledge files; `swiftpost-site-template` carries a Gem in the same layout
that does.

`default` is the general-purpose assistant, for understanding concepts and
checking claims, with no specialisation. A specialised assistant would sit
beside it under its own name.

It answers to **Mr. Wolf** in English and **Ettore** in Italian. The English
name matches the persona the instructions carry, so those files simply keep it;
the Italian ones override it, and say in as many words that the block above
defines the working style rather than the name.

The Italian versions are not translations. They carry a register section built
on [il Post's account of its own
language](https://www.ilpost.it/2020/04/16/la-lingua-che-parla-il-post/), which
has no English equivalent, so the two diverge on their largest section. Do not
try to keep them in step.

## What the sizes cost

Each product caps its instruction field, and the shorter the field the more
gets dropped. In order of what survives:

| | duck.ai ~500 | ChatGPT ~1,500 | Gem ~10,500 |
| --- | --- | --- | --- |
| Name, register, plain language | yes | yes | yes |
| Answer instead of correcting | one clause | full rule with exclusions | full section |
| No fabrication | yes | yes | yes |
| Change position on evidence, not pressure | yes | yes | yes |
| Retrieval, with links | no | yes | yes |
| Labelling claims: established / contested / inference / guess | no | yes | yes |
| Source ladder, four tiers | no | no | yes |
| Own recall is a lead, not a citation | no | one clause | yes |
| Answer shape and length discipline | no | one clause | yes |

## Generated versus hand-written

**The Gem files are generated.** They are large enough to carry the canonical
persona and verification text verbatim, so they do, and the copy is mechanical:

```bash
yarn assistants:build   # regenerate from chat-assistants/*/templates/
yarn assistants:check   # fail if a generated file drifted from its template
```

Edit `gemini-gem/templates/*.template.md`, never the generated
`gemini-gem/*/instructions.md`. The `{{PERSONA}}` and `{{VERIFICATION}}`
placeholders are filled from
`.agents/skills/ref-sp-agents-mr-wolf-persona` and
`.agents/skills/ref-sp-agents-verification-discipline`, which own that text.

**The ChatGPT and duck.ai files are hand-written.** At 500 and 1,500 characters
no canonical block fits, so they are compressions of the same ideas, which
makes them forks rather than projections. Nothing regenerates them and no check
catches them drifting from the skills. When you change a rule in the persona or
verification skill, decide deliberately whether the short versions should
follow.

## Adding a new assistant

Worth doing with an agent, which can read the skills and the existing files.
Roughly:

1. **Decide the product and find its field limit.** Every one of these limits is
   undocumented or contested, so measure the text rather than trusting a number
   from a blog. Each product README records what is known and what is not.
2. **Decide the language.** English gets the plain-language register; Italian
   gets the il Post register. A new language needs its own register section,
   not a translation of an existing one.
3. **Start from the closest existing file.** The spine is persona, verification,
   correction discipline, sourcing, answer shape. What changes between
   assistants is the opening paragraph that says what the assistant is for, and
   whatever domain rules it needs.
4. **If the field is large, template it.** Put `{{PERSONA}}` and
   `{{VERIFICATION}}` in a `templates/<name>.template.md` under the product
   folder and run `yarn assistants:build`. If the field is small, write it
   by hand and say in the product README that it is a fork.
5. **For a Gem that needs knowledge files**, the exporter bundles skills into
   them: `yarn cli export build --target gemini-gem --config <config.json>
   --out <dir>`. It refuses to build an empty
   selection, so a Gem with no knowledge files does not go through it.
6. **Test the two failure modes**: ask it something factual and watch the
   register, then push back on a correct answer and see whether it re-verifies
   or folds.
