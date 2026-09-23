---
name: site-copy
description: Voice rules for every piece of text on the Equestrian Coaches Australia site and in its emails. Use whenever writing, rewriting or reviewing user-facing copy (page headings, body text, buttons, FAQ answers, email templates, error messages, admin help text) so it reads like a person wrote it. Always run the humanizer skill on the result before finishing.
---

# Site copy

Alana's rule, 22 Sep 2026: the site text sounds too much like an AI wrote it. Every text task runs through this skill, and the result goes through the `anthropic-skills:humanizer` skill before it is done.

## The brief

When generating or revising text, write in a way that feels natural, human, and context-aware rather than formulaic or AI-like. Preserve the original meaning, but replace generic, inflated, or promotional wording with clear, specific, and factual language. Avoid vague attributions such as unnamed "experts" or "studies" unless concrete details are provided. Prefer direct, plain phrasing over abstract or filler-heavy expressions, and cut unnecessary phrases like "in order to" or "at this point in time." Reduce excessive hedging and remove stock structures that feel templated, such as predictable intros, summaries, or "challenges/future outlook" sections unless they are genuinely required. Vary sentence length and rhythm so the prose does not sound uniform or mechanical, and add light human texture or perspective only when it fits the intended tone. Avoid overusing em dashes, and remove assistant-style artifacts like sign-offs, disclaimers, or references to being an AI. The final output should read smoothly, sound like it was written by a person, rely on concrete details over generalities, and maintain a consistent tone appropriate for the audience and purpose.

## How to apply it here

1. Load `anthropic-skills:humanizer` at the start of any text task, not at the end. Its pattern list is the checklist.
2. Write the copy, then read it back as Kim would say it to a coach at a clinic. If she would not say it, change it.
3. Facts only from the brief, CLAUDE.md, or the person asking. No invented numbers, dates, names or quotes. A square-bracket placeholder is better than a guess.
4. Two audiences: riders (casual, free, browsing) and coaches (paying, want to look credible). Same plain voice for both, different concerns.
5. No em dashes or en dashes in site copy. Use a full stop, comma or colon.
6. No "not just X, it's Y", no rule-of-three padding, no "we're passionate about", no "seamless", "elevate", "unlock", "journey".
7. Headings in sentence case. Buttons say what happens ("Save", "Find a coach"), not "Submit" or "Get started today".
8. Numbers that could change (prices, dates, caps) come from the `settings` table or `src/lib/tiers.ts`, never typed into JSX.
9. Before finishing, scan the final text for the humanizer's patterns and for dashes. Then say in the summary that the humanizer pass ran.
