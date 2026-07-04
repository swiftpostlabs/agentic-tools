# Other / Fill Blank

Use this mode when the user wants some other export target entirely, or when the target does not cleanly fit repo linking, manual copying, or Gemini Gem knowledge.

Examples:

- a text summary for another agent
- a markdown catalog for documentation
- a prompt for another AI to recreate the selected skills
- a checklist for a human reviewer

## First step for Other mode

Ask the user to fill in the missing target clearly.

Useful follow-up questions:

1. What should the output be?
2. Will the result be linked, copied, summarized, or pasted elsewhere?
3. Does the target need real skill folders or only a distilled summary?
4. Should repo-local skills be excluded entirely?

## Core rules for Other mode

Even in fallback mode, keep the quality bar the same:

- use only the minimum relevant skills
- include hard dependencies when the result must be operational
- call out repo-local exclusions explicitly
- preserve exact skill names so the user can map the result back to the repo
