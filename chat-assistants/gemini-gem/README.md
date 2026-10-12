# Gemini Gem

A Gem is a saved Gemini configuration with its own instructions and optional
knowledge files.

## Setting it up

1. Go to <https://gemini.google.com> and create a new Gem. The button has moved
   around over time; look for Gems in the sidebar or under Explore.
2. Open [`default/instructions.md`](./default/instructions.md) for English or
   [`default-it/instructions.md`](./default-it/instructions.md) for Italian,
   copy the whole file, and paste it into the Gem's instructions field.
3. Leave Knowledge empty. This assistant carries no knowledge files, and adding
   the repo's skills would fill it with software-development guidance it has no
   use for.
4. Save, then check two things in the first conversation:
   - Ask **"what is your name?"** English answers Mr. Wolf, Italian answers
     Ettore. Either way it should give the name and stop there, without
     explaining the reference or playing the part.
   - State something confidently wrong and push back when it corrects you. It
     should re-verify rather than fold. That behaviour is the whole point.

## Limits

- **Knowledge files**: 10 per Gem, 100 MB each. Irrelevant here, since this Gem
  uses none.
- **Instruction field length**: undocumented. Google's own [tips for creating
  custom Gems](https://support.google.com/gemini/answer/15235603) says nothing
  about a cap. These files are around 10,400 characters and have not been
  rejected, but that is one data point, not a documented limit.
- **Web access**: not documented either way. The instructions assume search is
  available and tell the assistant to admit it when retrieval is not. To find
  out, ask it something that needs current information and see whether links
  come back.

## Editing

These files are generated. Edit
[`templates/default.template.md`](./templates/default.template.md) or
[`templates/default-it.template.md`](./templates/default-it.template.md), then:

```bash
yarn assistants:build
```

The `{{PERSONA}}` and `{{VERIFICATION}}` placeholders are filled verbatim from
the skills that own that text. Editing a generated `instructions.md` directly
forks it from its source, and `yarn assistants:check` will fail until it
is regenerated.
