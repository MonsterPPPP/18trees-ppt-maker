<p align="center">
  <img src="./assets/banner.webp" alt="十八木" width="100%" />
</p>

<p align="center">
  <a href="./README.md">中文</a> · <strong>English</strong>
</p>

# 18trees-ppt-maker

**Make a PPT that explains itself without you — because it is meant to be sent straight to other people.**

From raw material all the way to an HTML deck you can send to others as-is — then export PDF, package with consistent naming, and deliver. Works with Claude Code, Codex, and any AI tool that can read and write files and run Node scripts.

> A PPT production workflow skill: six phases from raw material to a self-explanatory HTML deck and PDF, plus 10 hard-won taste rules and a **mandatory independent sub-agent review** that you are not allowed to skip.

---

## What problem this solves

Most PPTs are **support material for a script**: the whitespace waits for the speaker to fill it in, the small print waits for the speaker to explain it, and what does not fit on one page gets a "let me expand on that".

The moment you **send that deck straight to someone else** — no you, no verbal additions, they just open it and flip through it themselves — it falls apart immediately. The footnote at the bottom nobody reads, an English label like `WHY NOW` that needs someone standing beside it to explain, a table squeezed down to 14px to fit — all of it turns into "what does this mean".

The one and only reason this skill exists is to hold a single test:

> **Can a person who knows nothing about the background, looking only at this page, understand by themselves what it is trying to say — and how it relates to this page's topic?**

Anything that answers "no" — **either make it clear, or delete it. There is no third option.**

Around this test it governs a whole set of very concrete things: no stray small print at the bottom of a page, no English labels that need verbal explanation, a minimum font size for body text, one structure per page, no padding the layout with blank space, no losing information during a restructure, no real human names in the credits. **Every one of them corresponds to a real round of rework.**

---

## Our contribution

### 1. Mandatory independent sub-agent review — the only mechanism-level addition

A generator cannot see its own problems. **Because the generator carries the background in its head, it unconsciously auto-"completes" the explanations missing from the page.** The client does not have that background, so all they see is a pile of "what does this mean".

This perception gap **cannot be corrected by introspection**. So this skill mandates: for every finished version of the deck, a sub-agent must be started to play the client themselves and do an independent review; after the fixes, **run it again** — until the list has no P0/P1 left.

The key point is that the reviewer receives **only three inputs**:

| Gets | Does not get |
|---|---|
| The path to the produced `index.html` | Why it was designed this way |
| `references/taste.md` (the taste profile = its persona) | What this page is trying to say |
| The narrative outline (used only to check whether information was dropped) | What was compromised, where the callbacks are |

**Any explanation destroys the value of this review.** Give it background and it starts making excuses for the page.

It is also required to answer 14 checks (A–N) one by one, output a graded list with page numbers and quotes from the source, and — **"find at least 5 problems. If you genuinely cannot find 5, that means you did not check hard enough."**

The spec and the full prompt template are in [`references/reviewer-persona.md`](skills/ppt-maker/references/reviewer-persona.md).

### 2. Taste is not designed — it grows out of rework

10 P0 iron rules plus a taste profile with the source of every quote. Not "design principles" — things the client yelled:

> "No small print may stand alone at the bottom of any page — fold all of it into the main visual narrative"
>
> "These small texts make people feel **the meaning is unclear** — you have to resolve that unclarity"
>
> "v0.6 **lost things compared to v0.5!!!!**"
>
> "The deck mentions 6 paid conversions — change it to 'there are paid conversions', **stop stressing the specific number**"

Every entry spells out: the **trigger** (what counts as hitting it), the **handling** (how to change it), and a dated source for the original quote.

This [`taste.md`](skills/ppt-maker/references/taste.md) is **continuously appended** — it is the real heart of this skill. It grows on feedback, not on design.

### 3. Two scripts you can run directly, automating the machine-checkable parts

```bash
# Static checks: page-number continuity, minimum font size, stray small print at the bottom,
#               English eyebrows, unexplained abbreviations, placeholders, mobile display:none hiding body text, real names
node scripts/validate-ppt.mjs 项目/xxx/ppt/index.html

# Export PDF + package the three-file bundle with a shared filename prefix
node scripts/export-pdf.mjs 项目/xxx/ppt/index.html \
  --out 项目/xxx/材料-PDF版.pdf \
  --package 项目/xxx/交付物 --outline 项目/xxx/材料-vN.md
```

Both scripts use only the Node standard library — **zero npm dependencies**. The export finds your local Edge / Chrome engine on its own.

**But they cannot replace the sub-agent review.** The scripts only block low-level, machine-checkable problems — whether "this page can be understood" is not something a machine can decide.

### 4. The full six-phase pipeline — the order cannot be shuffled

```text
raw material → narrative outline → HTML deck → static checks + independent review → viewport checks → export PDF · package deliverables
```

Enter the next phase before the previous one is stable and everything downstream gets reworked. Two hard rules that are easy to skip:

- **Never drop anything while iterating.** Every version is an **append or restructure** on top of the previous one, not a rewrite. Save the previous version before changing structure; verify item by item after.
- **Both viewport checks must pass.** Desktop `1440×900` + mobile `390×844`. On mobile it is **not allowed** to "solve" overflow by hiding body text with `display:none` — that turns the deck into torn pages.

The deliverables are always **the three-file bundle with a shared prefix in one folder**: outline md (the editable source) + HTML (the flip-through presentation) + PDF (the one you send out).

### 5. A side feature: standing on upstream's shoulders, and stating the license boundary clearly

**This skill carries no rendering capability of its own.** The rendering layer is a separate, excellent open-source project:

| | |
|---|---|
| Engine | [`guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill) · **26,694 stars** |
| Author | **歸藏** ([@op7418](https://x.com/op7418)) |
| License | **AGPL-3.0** |

Division of labor: **the engine handles "rendering the HTML deck" (templates / CSS / motion / 22 Sxx layouts / Swiss-style checks); this skill handles "whether what came out is good enough to send to someone as-is" (independent-reading iron rules / layout conventions / the review step / PDF delivery).**

**This repository contains none of upstream's code, template, or documentation assets** — at runtime it reads the upstream directory already installed on your machine, by path. So this is a **plugin relationship, not a merger**: upstream updates land on your side directly, with no waiting for this repo to sync; and that is why this layer can choose MIT on its own.

> ⚠️ But once that premise is broken — upstream assets copied in, the two bundled into a single distribution — the whole must be converted to **AGPL-3.0** with attribution preserved. See [`references/engine.md`](skills/ppt-maker/references/engine.md) for details.

### What is not done (it is a design choice)

- **No rendering engine.** That is upstream's territory, and it is their strength.
- **No `dist/` single-file version.** See the note below.
- **No visual editor.** The output is static HTML, not a multi-user collaboration platform.
- **No pure chart reports.** That is a job for Excel / PowerPoint.

### Weaknesses (brief)

- **The rules come from one client's taste.** They will not all be right for you — but [`taste.md`](skills/ppt-maker/references/taste.md) spells out how to change each one, so swapping in your own taste is cheap.
- **Depends on the upstream engine, and has only been tested on Windows.** The export script looks for Edge / Chrome; the paths under macOS / Linux are unverified.
- **Hard dependency on sub-agent capability.** On hosts that do not support subagents, contribution #1 fails outright.
- **0 stars, a new project.**

---

## Installation

### 1. Install the engine first

```bash
# Check whether the engine is present (adjust the path to your agent's skills directory)
ls <SKILLS_DIR>/guizang-ppt-skill/SKILL.md
ls <SKILLS_DIR>/guizang-ppt-skill/assets/template-swiss.html
```

If it is not installed, install [`guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill) first, then come back.

**Do not** copy upstream templates into this repo for the sake of "self-containment" — that turns the plugin relationship into a merger, and the license requirements change with it.

### 2. Then install this skill

### Claude Code

```bash
/plugin marketplace add MonsterPPPP/18trees-ppt-maker
```

```bash
/plugin install ppt-maker@18trees-ppt-maker
```

Or manually: copy the entire `skills/ppt-maker/` folder into `~/.claude/skills/`.

### Codex

Copy `skills/ppt-maker/` into `~/.codex/skills/` (for project level, `.codex/skills/`).

### 3. Dependencies

Only **Node.js 18+** is required (both scripts use the standard library, no npm dependencies). Exporting PDF requires a Chromium-based browser (Edge or Chrome; the script finds it automatically).

### ⚠️ Web-based chatbots cannot use this skill

**It reads and writes files on your machine and runs Node scripts**: running static checks, driving a headless browser to export PDF, packaging the three-file bundle into a specified folder. Web-version ChatGPT / Gemini / DeepSeek / Kimi / Doubao have no tool capability and cannot do any of this.

The test: **does it need to execute commands or access the file system?** If yes → it must have tool capability.

### Why this repo has no `dist/` single-file version

Other skills from this org additionally ship a "all rules bound into one, pasteable into any chatbot" single-file version. **This skill does not, because it cannot.**

The phase-4 static checks and the phase-6 PDF export are **two real Node scripts** (`validate-ppt.mjs` has 40+ checks; `export-pdf.mjs` has to drive a headless browser). A pasted block of text cannot carry them. Force one out anyway and users get stuck at the first `node` call — that is worse than not doing it.

---

## Usage

```
You: make a ppt from this material
```

It will: read your material → write a narrative outline md with a two-part structure → choose style and layouts → generate a single-file HTML deck → run static checks → **start a sub-agent to play the client and review** → fix until the list is empty → pass both viewport checks → export PDF and package the three-file bundle.

Once feedback arrives, just say it plainly:

| You say | It does |
|---|---|
| "This page is too messy" | Collapse to one structure per page; details go into a table |
| "I can't understand this small print" | Either fold it into the main thread, or delete it |
| "Pack the information tighter" | Expand each page to 3–6 information modules, carried by tables/grids |
| "The layout is not neat" | Align item counts, line heights, sentence lengths |
| "Export the PDF and package it for me" | The three-file bundle with a shared prefix, in one folder |

**Every new piece of feedback should be appended to `references/taste.md`** — that is the only way to turn it into "your skill".

---

## Repository structure

```text
.
├── skills/ppt-maker/                      ← rule source files (the single source of truth)
│   ├── SKILL.md                            soul, six-phase workflow, 10 P0 iron rules
│   ├── references/
│   │   ├── taste.md                        ★ taste profile (landmines / preferences, with feedback sources) — continuously appended
│   │   ├── reviewer-persona.md             sub-agent review spec + full prompt template
│   │   ├── readability-rules.md            layout details (font-size ladder, page-number convention, structure convergence)
│   │   ├── outline-to-deck.md              raw material → outline → page mapping method
│   │   ├── export-and-package.md           HTML→PDF mechanics and all known pitfalls
│   │   └── engine.md                       engine plugin: upstream identity card, credits, license boundary
│   ├── scripts/
│   │   ├── validate-ppt.mjs                independent-reading static checks
│   │   ├── forbidden-names.txt             real-name blacklist template (empty by default, fill in your own)
│   │   └── export-pdf.mjs                  export PDF + three-file bundle packaging
│   └── agents/openai.yaml                  Codex UI metadata
├── assets/banner.webp                      brand banner
└── CONTRIBUTING.md / AGENTS.md / LICENSE / NOTICE.md
```

---

## Development

The project follows a minimal-implementation principle; upstream text and assets are never committed, only link-referenced. Read [CONTRIBUTING.md](CONTRIBUTING.md) before making changes — especially the one about **not breaking the plugin boundary with upstream**.

---

## Comparison with similar projects

In this space, **the engine layer already has an absolute winner, and the "spec layer" is nearly empty.**

**Data as of 2026-09-21; star counts are a same-day snapshot.**

| Project | Stars | Layer | Role |
|---|---:|---|---|
| [op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) | **26,694** | Rendering engine | HTML slide deck generation: magazine and Swiss layouts, 22 Sxx layouts, image prompts, WebGL presentation runtime. **This project depends on it; it is not a competitor** |
| **This project** | **0** | Spec + acceptance | Independent-reading iron rules, mandatory independent sub-agent review, static-check scripts, PDF three-file delivery |
| [wetlink/ppt-maker-skill](https://github.com/wetlink/ppt-maker-skill) | 1 | Spec | Anti-AI-slop, produces **editable real .pptx** (not HTML) |
| [SanHsien/dashi-ppt-skill](https://github.com/SanHsien/dashi-ppt-skill) | 0 | Spec | 12 themes, in-browser editing, exports editable PPTX |
| [turaliyev0/PPT_Maker](https://github.com/turaliyev0/PPT_Maker) | 0 | Spec | Automatic PPT maker skill |
| Gamma / Tome / Beautiful.ai | — | SaaS | Online generation, not self-hostable, no readable source output |

### How to choose

| Your situation | Recommendation |
|---|---|
| You only want an engine that generates good-looking decks | Use [`guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill) directly — that is exactly what it does |
| You already have a deck and need to judge **whether it can be sent out as-is** | **This project** — static checks + zero-context independent review |
| The other side needs to **keep editing in PowerPoint** | The wetlink one (this project's output is static HTML) |
| You want online generation and do not care about self-hosting | SaaS like Gamma |

**One sentence**: upstream answers "**how to render the deck**"; this project answers "**whether this deck is fit to be sent out without explanation**".

## License

[MIT](LICENSE) © 2026 十八木 — this repository contains none of upstream's (AGPL-3.0) assets; upstream is a runtime dependency, not a redistribution, and that is the only reason this layer can choose its own license.

**Packaging the two together for distribution changes that** — the third-party dependency and the boundary are documented in [NOTICE.md](NOTICE.md), with details in [`references/engine.md`](skills/ppt-maker/references/engine.md).
