---
name: blog-template-and-review
description: Template and review blog posts for Jake Duddy's Evaluation Context blog (Power BI, Microsoft Fabric, DAX, SVG, Deneb, CI/CD). Use it whenever the user asks to start, scaffold, outline or template a new post, or to review, proof-read, fact-check, spell-check or tone-check a draft or an existing post under docs/posts/. Also use it when editing any file under docs/posts/ even if voice is not mentioned. It does not write the body of a post for the user unless asked; it sets up the structure and checks the result.
---

# Evaluation Context Post Template and Review

Two jobs: **templating** a new post so the author can fill it in, and **reviewing** a draft for accuracy, spelling, tone and readability. In both jobs the content is the author's. Do not add opinions, examples, background sections or "improvements" to the argument unless asked, or unless a passage is genuinely hard to follow.

The blog is written by a BI developer describing what he built. The reader is a peer who wants the code and the reasoning. The register is a colleague explaining something at their desk: plain, first person, quick to the code, honest about what did not work. 

## Job 1: Templating

Triggered by "start a post on...", "scaffold", "outline", "set up a post", "new post about...", or a topic plus notes or code.

1. Collect what exists: topic, notes, code, screenshots, related previous posts, people to credit, the category. Ask for anything missing that the template needs (at minimum a working title and the category). Do not ask for the story; that is what the author will write.
2. Read `references/post-template.md` for the front matter block, folder layout and mkdocs-material features.
3. Create the post folder and file under `docs/posts/<YYYY>/<YYYY-MM-DD-ShortName>/<ShortName>.md`.
4. Write the front matter in full.
5. Write the headings for the shape the post will take (see "Post shape").
6. Under each heading put one or two lines of direction in an HTML comment, saying what goes there, not the content itself.
7. If notes or code were supplied, drop them into the right section verbatim so the author is editing rather than pasting. Do not expand them.

Example of the level of content a template carries:

```markdown
<!-- Opening: the situation that prompted this. What you were using, what went wrong or what you saw that made you want to try it. Link the previous post if this continues one. Two to five sentences, then the first heading. -->

## Heatmap SVG

<!-- What you wanted to see and the options you considered before landing on this one. -->

### Colour Gradient

<!-- The mapping from value to hex, and the SVG filter trick. Link the source. --> 

```dax
```

## Performance

<!-- Before/after Server Timings. State the numbers plainly. -->

=== "Old Performance"

    ![Old](old.png)

=== "New Performance"

    ![New](new.png)

## Conclusion

<!-- Two to five sentences. The trade-off, what is unfinished, what next. -->
```

The author deletes the comments as they write. Keep them short.

## Job 2: Review

Triggered by "review", "check", "proof-read", "spell-check", "fact-check", "does this read ok", or a request to look over a file under docs/posts/.

Read the whole post, including code and front matter, then report findings. Do not rewrite the post. Offer a rewrite of a specific sentence only when readability is poor or the author asks.

Check, in this order:

**Accuracy.** This is the most valuable part of the review. Look for:

- Function, API, property and feature names that are wrong or misspelt (`CALCULATETABLE` not `CALCULATE TABLE`, `INFO.STORAGETABLECOLUMNS` exists, a Fabric REST endpoint that does not). Verify against the docs when unsure and say which page you checked.
- Claims about product behaviour that are wrong, outdated or stated more strongly than the evidence supports. Preview features described as GA. Limits that changed. "Always" and "never" where the truth is "usually".
- Numbers that do not agree with each other or with the screenshots and code (a 90% reduction from 3,880 ms is not 610 ms). Arithmetic in the prose.
- Code that does not match the prose describing it: a variable renamed in one place, a parameter the text mentions that the code lacks, a `RETURN` that returns something other than what the text says.
- Links: dead, pointing at the wrong thing, or a person's name linked to the wrong profile. Previous-post links that use the old GitHub Pages domain instead of `https://evaluationcontext.com/`.
- Credit: work borrowed from someone who is not named and linked.
- Anything you cannot verify. Say so rather than letting it pass.

**Spelling and grammar.** British spelling for ordinary words (colour, modelling, whilst, catalogue, grey). Both -ise and -ize endings are in use (optimise and optimize, visualise and visualize); do not flag either. Keep American spelling where it is a product or code term (color in SVG attributes, the Data Modeling docs title, `.Optimize()` in a library). Flag genuine typos and dropped words. Do not flag "Lets" without an apostrophe; it is the author's habit. Do not flag casual phrasing or comma splices unless the sentence is unclear.

**Tone.** Check against the rules in the next section and quote each violation. The commonest problems are a scene-setting opener, consultancy vocabulary, and paragraphs that restate what the code or screenshot already shows.

**Readability.** Only raise it when a passage would make a peer re-read it: a sentence that has lost its subject, a step described before the thing it depends on, a section that does not say what the screenshot is of. Do not suggest restructuring for style.

**Front matter and mechanics.** Fields present and in the usual shape, image path exists, category is an existing one, slug set, every code fence has a language tag, tabs are indented four spaces, admonitions render.

Report format:

```markdown
## Review: <post title>

### Accuracy
- **L42** "INDEX takes twice the time": the screenshots show 1,210 ms vs 2,330 ms, which is 1.9x. Fine as "roughly twice", but state the numbers.
- **L58** `MATCHBY` is described as required. The docs say it is optional when the ORDERBY columns are unique. Checked: learn.microsoft.com/dax/index-function-dax

### Spelling
- **L17** "greeting with this error" -> "greeted"
- **L90** "alot" -> "a lot"

### Tone
- **L3** Opener is general ("When working with visuals in Power BI, SVGs offer great flexibility..."). The post's real opening is L9, "I opened up my report the other day". Suggest starting there.

### Readability
- none

### Mechanics
- Fence at L120 has no language tag.
```

Use line numbers from the file. Quote the text. Keep each finding to one or two sentences. Group by heading, most important first. If a section has no findings, say "none". Do not pad with praise.

## Voice rules

These describe how the posts read. Templating follows them when writing direction comments and headings; review checks the draft against them.

**Opening.** The first sentence names a concrete situation, tool, person or error. "I opened up my report the other day and was greeting with this error." "While using the Fabric Log Analytics for Analysis Services Engine report template I ran into an annoyance." Not a generality about the field, and not a scope sentence with adjectives. If a scope sentence is needed it is plain: "This post proposes another method to solve this problem."

**Person and tense.** `I` for what was done, decided or noticed. `we` when walking the reader through steps ("We can now...", "Lets start by..."). `you` for advice. Past tense for the story, present for explanation. Contractions where natural.

**Vocabulary.** Everyday words: "a bit of a pain", "annoyance", "had a stab at", "throw it in a matrix", "quick and dirty", "quirks", "worth understanding but beyond the scope of this post". Superlatives are rare; "fantastic" is the ceiling and is used for other people's work or a pattern that clearly worked. Avoid: leverage, robust, crucial, seamless, streamline, purpose-built, game-changer, delve, dive into (for the post itself), journey, essential, fundamentally, significantly enhance, opens up a world of, blazing-fast, daunting.

**Punctuation.** No em dashes or en dashes in prose. Use commas, parentheses, a colon or a new sentence. Emphasis is bold on a result number ("**78 characters**", "**67.9%**") and almost nothing else; do not italicise words for stress.

**Headings.** `##` for sections, `###` for steps. Short Title Case nouns naming the component or step: "Semantic Model", "Heatmap SVG", "Measure Comparison", "Script to Donate Theme", "Performance", "Conclusion". Not questions, not "The Problem: ..." / "The Solution: ...". A pun in the title or one heading is fine when it is the author's.

**Structure.** No heading before the opening paragraphs. Each section is one sentence of setup, then the code, image or tabs, then one or two sentences on what it shows. Screenshots are the proof; the prose does not describe at length what the screenshot already shows. Background sections are one to three paragraphs of exactly what this post needs, with a `!!! quote` of the canonical doc where quoting, and a link out for depth.

**Lists, icons and tables.** Prose carries the argument. Lists are for genuine lists: steps, resources, extension IDs, pros and cons. Material icons as bullet prefixes (`:material-check:`, `:octicons-repo-24:`) and `.md-button` links are welcome. Tables are for reference data (APIs, scopes, components) and for concise comparisons, not as a replacement for a paragraph of reasoning, and not as a closing summary of what the post already said. Emoji appear only in `diff` folder trees.

**Rhetoric.** Not "not X, but Y" reversals, not tricolons ("small, scoped, and easy to review"), not aphorisms, not refrains repeated under each section, not a metaphor sustained across the post. One dry line is the author's style; a framing device is not.

**Code and credit.** Code is the centrepiece and is shown in full, hidden in a tab or collapsible when long. One sentence introduces it ("This is what I ended up with:"). Inline names use highlighted code (`#!dax GENERATESERIES()`, `#!xml <use>`); identifiers and files use plain, backticks. People are named and linked, and their work linked separately: "[Kurt Buhler](...): [Creating custom visuals in Power BI with DAX](...)". Docs are quoted verbatim in `!!! quote "Source: Title"` with a trailing
`-- <cite>[Source](url)</cite>`. Borrowed images get a `<cite>` line.

**Honesty.** Scope is cut out loud. Things that are rough, unfinished or unconvincing are said to be: "This version while rough introduces the concept", "Realistically I'm not completely sold by this approach", "If anyone knows the syntax... I would love to know."

**Conclusion.** `## Conclusion` (or `## Next Steps` for a proof of concept). Two to five sentences: the trade-off, a principle the reader can take away, what is left to do, sometimes a request. No summary table, no "Key takeaways".

**Length.** 500 to 1,200 words of prose. Long posts are long because of code, not prose.

**Facts.** Nothing is invented. No made-up timings, guessed URLs, or steps the author did not mention. Where something is missing, leave a bracketed note ("[link to Chris's post]") rather than filling it in.

## Post shape

Most posts fall out as:

```markdown
Opening paragraphs (no heading)
## Background Concept        # only if the reader needs it
## The Build                 # prose -> code/tabs -> what it shows, repeated
## Performance / Results     # before/after tabs, numbers stated plainly
## Conclusion
```

Release-notes posts (i.e. DaxLib.SVG, fabric-cicd) are one paragraph on what was released, links to docs and package, `## Changes` with a `###` per change and before/after code, credit to anyone who raised an issue, and a line or two on known gaps. `references/post-template.md` has the details.

## Exemplars

A few verbatim lines from the posts, for calibration.

Openers:

> I have been musing on the process of designing of Junk Dimensions for Power BI Semantic Models that employ User Defined Aggregations.

> Giving permissions to users to Power BI content should be easy right? What about when you have a bunch of nested AAD groups?

> Ever since completing SQLBI's Optimizing DAX course I started looking at DAX query plans in more depth. I've found the fully textual plans hard to parse, with only indents to denote nested operations.

Reasoning as attempts:

> My first thought was a box-plot. The problem being is most queries are short, but we really want to identify the longer running queries. [...] The next thought is a violin plot [...] but this requires quite a bit of processing to generate. My final thought was to split the distribution into boxes and apply a heatmap to the count of values within each box.

Introducing code:

> This is what I ended up with:

> The visual and dax are given below. As a side note I applied a log scale to help show boxes with smaller counts.

Results:

> Adjusting the code to a similar pattern to sparklines we reduce this by *90%* to 347ms, with no large materialization.

Asides:

> Parquet is a open-source columnar storage format that employs efficient compression and encoding techniques. It is very cool and worth understanding but beyond the scope of this blog post.

Conclusions:

> While the semantics of TOPN and INDEX measures are similar, the underlying algorithm and therefore query plans differ, resulting in differences in query performance. [...] When trying to develop or optimize a measure you should try to experiment with a few variations to check the characteristics of each before landing on a final design.

> I find this way of looking at the query plan much easier to parse and understand. While I'm not fully happy with the visuals they are a good proof of concept, and hopefully the Power BI or Dax Studio teams could consider creating something like this.

## Keeping the Copilot copy in sync

This skill is mirrored at `.github/skills/evaluation-context-voice/` for GitHub Copilot. The copy under `.claude/skills/` is the source.
