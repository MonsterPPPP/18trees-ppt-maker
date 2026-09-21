<p align="center">
  <img src="./assets/banner.webp" alt="十八木" width="100%" />
</p>

<p align="center">
  中文 · <a href="./README.en.md">English</a>
</p>

# 18trees-ppt-maker

**做一份没有你也能自己讲清楚的 PPT——因为它是直接发给别人看的。**

从素材一路做到可以直接发给别人看的网页 PPT，再导出 PDF、命名打包交付。适用于 Claude Code、Codex，以及任何能读写文件、执行 Node 脚本的 AI 工具。

> A PPT production workflow skill: six phases from raw material to a self-explanatory HTML deck and PDF, plus 10 hard-won taste rules and a **mandatory independent sub-agent review** that you are not allowed to skip.

---

## 它解决什么问题

大多数 PPT 是**讲稿的辅助**：留白等讲者补话，小字等讲者解释，一页讲不完就说"这个我展开说一下"。

一旦你把这份 PPT **直接发给别人**——没有你、没有口头补充、对方自己打开自己翻——它立刻就散了。底部一行没人看的脚注、`WHY NOW` 这种要旁边人解释的英文标签、缩到 14px 才塞得下的表格，全都变成了"这什么意思"。

这个 skill 存在的唯一理由，是守住一条判据：

> **一个完全不了解背景的人，只看这一页，能不能自己看懂它想说什么、以及它跟这一页主题的关系？**

答"不能"的元素——**要么解释清楚，要么删掉。没有第三种处理方式。**

围绕这条判据，它管住了一整套很具体的东西：底部不许有孤立小字、不许出现需要口头解释的英文标签、业务字号有下限、一页只用一个结构、不许用空白糊版面、重构时不许丢信息、署名不写真人姓名。**每一条都对应一次真实的返工。**

---

## 我们的贡献

### 1. 强制子 Agent 独立评审——这是唯一的机制性增量

生成者自己看不出问题。**因为生成者脑子里有背景，会无意识地自动"补全"页面里缺失的解释。** 委托人没有这个背景，所以他只会看到一堆"这什么意思"。

这个认知差**无法靠自省修正**。所以这个 skill 强制：每完成一版 deck，必须起一个子 Agent 扮演委托人本人做独立 review，改完**再跑一次**，直到清单里没有 P0/P1。

关键是它给 reviewer 的输入**只有三样**：

| 给它 | 不给它 |
|---|---|
| 产出的 `index.html` 路径 | 为什么这么设计 |
| `references/taste.md`（口味档案 = 它的人格） | 这页想表达什么 |
| 叙事大纲（只用于核对有没有丢信息） | 有哪些妥协、哪里有呼应 |

**任何解释都会毁掉这次 review 的价值。** 给了背景，它就会开始替页面辩解。

它还会被要求逐条回答 14 项检查（A–N），输出带页码与原文引用的分级清单，并且——**"至少找出 5 条问题。如果确实找不满 5 条，说明你检查得不够狠。"**

规格与完整 prompt 模板见 [`references/reviewer-persona.md`](skills/ppt-maker/references/reviewer-persona.md)。

### 2. 品味不是设计出来的，是从返工里长出来的

10 条 P0 铁律 + 一份带原话出处的口味档案。不是"设计原则"，是委托人骂出来的：

> "所有页面底部不准单独出现小字，全部融入主视觉叙事"
>
> "这些小字让人感觉**意义不明**，你要解决这种意义不明"
>
> "v0.6 相比 v0.5 **丢东西了！！！！**"
>
> "全篇中有提到 6 位付费转化，改为'有付费转化'，**不再强调具体位数**"

每一条都写清了：**判定**（什么情况算触发）、**处理**（怎么改）、以及带日期的原话出处。

这份 [`taste.md`](skills/ppt-maker/references/taste.md) 是**持续追加**的——它是这个 skill 真正的心脏。它靠反馈长大，不靠设计长大。

### 3. 两个能直接跑的脚本，把可机器判定的部分自动化

```bash
# 静态校验：页码连续性、字号下限、底部孤立小字、英文 eyebrow、
#           未解释缩写、占位符、移动端 display:none 藏正文、真人姓名
node scripts/validate-ppt.mjs 项目/xxx/ppt/index.html

# 导出 PDF + 三件套同前缀命名打包
node scripts/export-pdf.mjs 项目/xxx/ppt/index.html \
  --out 项目/xxx/材料-PDF版.pdf \
  --package 项目/xxx/交付物 --outline 项目/xxx/材料-vN.md
```

两个脚本都只用 Node 标准库，**零 npm 依赖**。导出会自己找本机的 Edge / Chrome 内核。

**但它们替代不了子 Agent review。** 脚本只拦可机器判定的低级问题——"这页读不读得懂"机器判不了。

### 4. 六阶段全流程，顺序不能乱

```text
素材 → 叙事大纲 → 网页 PPT → 静态校验 + 独立评审 → 视口验证 → 导出 PDF · 打包交付
```

前一步没稳定就进下一步，后面全部返工。其中两条容易被跳过的硬规则：

- **迭代时不许丢东西。** 每一版都是在上版基础上**追加或重组**，不是重写。改结构前先存好上一版，改完逐条核对。
- **视口验证两个都要过。** 桌面 `1440×900` + 移动 `390×844`。移动端**不许**用 `display:none` 藏正文来"解决"溢出——那等于把 PPT 变成了残页。

交付物固定是**三件套同前缀放在一个文件夹**：大纲 md（可编辑源）+ HTML（可翻页演示）+ PDF（发出去的那份）。

### 5. 附带特性：站在上游肩膀上，并且把许可证边界讲清楚

**本 skill 不自带渲染能力。** 渲染层是一份独立的、优秀的开源项目：

| | |
|---|---|
| 引擎 | [`guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill) · **26,694 star** |
| 作者 | **歸藏**（[@op7418](https://x.com/op7418)） |
| 许可证 | **AGPL-3.0** |

分工：**引擎负责"把网页 PPT 渲染出来"（模板 / CSS / 动效 / 22 个 Sxx 版式 / 瑞士风校验），本 skill 负责"做出来的东西够不够格直接发给别人看"（独立阅读铁律 / 版面体例 / 评审环节 / PDF 交付）。**

**本仓库不包含上游的任何代码、模板或文档资产**——运行时按路径读取你本机已安装的上游目录。所以这是**插件关系**而不是合并关系：上游更新你直接吃到，不用等本仓库同步；本层也因此可以自主选 MIT。

> ⚠️ 但这个前提一旦被打破——把上游资产复制进来、把两者打成单一分发物——整体就必须转为 **AGPL-3.0** 并保留署名。详见 [`references/engine.md`](skills/ppt-maker/references/engine.md)。

### 没做的（是设计选择）

- **不做渲染引擎。** 那是上游的领域，而且是它的强项。
- **不做 `dist/` 单文件版。** 见下方说明。
- **不做可视化编辑器。** 产出是静态 HTML，不是多人协作平台。
- **不做纯图表报表。** 那该用 Excel / PowerPoint。

### 短板（简述）

- **规则来自一个委托人的口味。** 它对你未必全对——但 [`taste.md`](skills/ppt-maker/references/taste.md) 写明了每条怎么改，换成你的口味成本很低。
- **依赖上游引擎，且只在 Windows 上实测过。** 导出脚本会找 Edge / Chrome，macOS / Linux 下的路径未验证。
- **强依赖子 Agent 能力。** 不支持 subagent 的宿主上，第 1 条贡献直接失效。
- **0 star，新项目。**

---

## 安装

### 1. 先装引擎

```bash
# 检查引擎在不在（路径按你的 agent 的 skills 目录调整）
ls <SKILLS_DIR>/guizang-ppt-skill/SKILL.md
ls <SKILLS_DIR>/guizang-ppt-skill/assets/template-swiss.html
```

没装就先装 [`guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill)，再回来。

**不要**为了"自包含"把上游模板复制进本仓库——那会把插件关系变成合并关系，许可证要求随之变化。

### 2. 再装本 skill

### Claude Code

```bash
/plugin marketplace add MonsterPPPP/18trees-ppt-maker
```

```bash
/plugin install ppt-maker@18trees-ppt-maker
```

或手动：把 `skills/ppt-maker/` 整个文件夹复制到 `~/.claude/skills/`。

### Codex

把 `skills/ppt-maker/` 复制到 `~/.codex/skills/`（项目级放 `.codex/skills/`）。

### 3. 依赖

只需要 **Node.js 18+**（两个脚本用标准库，无 npm 依赖）。导出 PDF 需要一个 Chromium 内核浏览器（Edge 或 Chrome，脚本会自动找）。

### ⚠️ 网页版聊天机器人用不了这个 skill

**它在你的机器上读写文件、执行 Node 脚本**：跑静态校验、调 headless 浏览器导出 PDF、把三件套打包到指定文件夹。网页版 ChatGPT / Gemini / DeepSeek / Kimi / 豆包 没有工具能力，做不到这些。

判断标准：**它需不需要执行命令或访问文件系统。** 需要 → 必须有工具能力。

### 为什么这个仓库没有 `dist/` 单文件版

本组织的其他 skill 会额外提供一份"所有规则合订、可粘贴给任意 chatbot"的单文件版。**这个 skill 不提供，因为它做不到。**

第 4 阶段的静态校验和第 6 阶段的 PDF 导出是**两个真实的 Node 脚本**（`validate-ppt.mjs` 有 40+ 条判定，`export-pdf.mjs` 要驱动 headless 浏览器）。一段粘贴的文本带不动它们。硬做一份出来，用户会在第一个 `node` 调用处卡住——那比不做更糟。

---

## 使用

```
你：根据这份材料做一份 ppt
```

它会：读你的素材 → 写出两部分结构的叙事大纲 md → 选风格与版式 → 生成单文件 HTML deck → 跑静态校验 → **起一个子 Agent 扮演委托人做 review** → 改到清单清空 → 两个视口验证 → 导出 PDF 并打包成三件套。

拿到反馈后直接说人话：

| 你说 | 它做什么 |
|---|---|
| "这页太乱" | 收敛成一页一个结构，细节进表格 |
| "这小字看不懂" | 要么融入主线，要么删掉 |
| "信息再密一点" | 每页扩到 3–6 个信息模块，但靠表格/网格承载 |
| "排版不整齐" | 对齐条目数、行高、句长 |
| "导出 PDF 打包给我" | 三件套同前缀放进一个文件夹 |

**每一次新的反馈，都应该追加进 `references/taste.md`** —— 这是让它变成"你的 skill"的唯一方法。

---

## 仓库结构

```text
.
├── skills/ppt-maker/                      ← 规则源文件（唯一真相）
│   ├── SKILL.md                            灵魂、六阶段工作流、10 条 P0 铁律
│   ├── references/
│   │   ├── taste.md                        ★ 口味档案（雷区/偏好，带反馈出处）持续追加
│   │   ├── reviewer-persona.md             子 Agent review 规格 + 完整 prompt 模板
│   │   ├── readability-rules.md            版式细则（字号阶梯、页码体例、结构收敛）
│   │   ├── outline-to-deck.md              素材 → 大纲 → 页面 的映射方法
│   │   ├── export-and-package.md           HTML→PDF 的机制与全部已知坑
│   │   └── engine.md                       引擎插件：上游身份卡、致谢、许可边界
│   ├── scripts/
│   │   ├── validate-ppt.mjs                独立阅读静态校验
│   │   ├── forbidden-names.txt             人名黑名单模板（默认留空，填你自己的）
│   │   └── export-pdf.mjs                  导出 PDF + 三件套打包
│   └── agents/openai.yaml                  Codex UI 元数据
├── assets/banner.webp                      品牌 banner
└── CONTRIBUTING.md / AGENTS.md / LICENSE
```

---

## 开发

工程遵循最小实现原则；上游正文与资产一律不入库，只做链接引用。改动前请读 [CONTRIBUTING.md](CONTRIBUTING.md)——特别是关于**不要破坏与上游的插件边界**那一条。

---

## 和同类项目比

这个赛道里，**引擎层已经有一个绝对赢家，而"规范层"几乎是空的。**

**数据截至 2026-09-21，star 为当日快照。**

| 项目 | Star | 层 | 定位 |
|---|---:|---|---|
| [op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) | **26,694** | 渲染引擎 | HTML slide deck 生成：杂志风与瑞士版式、22 个 Sxx 版式、图片提示词、WebGL 演示运行时。**本项目依赖它，不是竞品** |
| **本项目** | **0** | 规范 + 验收 | 独立阅读铁律、强制子 Agent 独立评审、静态校验脚本、PDF 三件套交付 |
| [wetlink/ppt-maker-skill](https://github.com/wetlink/ppt-maker-skill) | 1 | 规范 | 反 AI 味、产出**可编辑的真 .pptx**（不是 HTML） |
| [SanHsien/dashi-ppt-skill](https://github.com/SanHsien/dashi-ppt-skill) | 0 | 规范 | 12 套主题、浏览器内编辑、导出可编辑 PPTX |
| [turaliyev0/PPT_Maker](https://github.com/turaliyev0/PPT_Maker) | 0 | 规范 | Automatic PPT maker skill |
| Gamma / Tome / Beautiful.ai | — | SaaS | 在线生成，不可自托管、不产出可读源码 |

### 怎么选

| 你的情况 | 建议 |
|---|---|
| 只想要能生成好看 deck 的引擎 | 直接用 [`guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill)，它就是干这个的 |
| 已经有一版 deck，要判断**能不能直接发出去** | **本项目**——静态校验 + 零背景下独立评审 |
| 需要对方能**在 PowerPoint 里继续编辑** | wetlink 那个（本产出是静态 HTML） |
| 想在线生成、不在乎自托管 | Gamma 这类 SaaS |

**一句话**：上游回答"**怎么把 deck 渲染出来**"，本项目回答"**这份 deck 够不够格不经解释就发出去**"。

## License

[MIT](LICENSE) © 2026 十八木 —— 本仓库不含上游（AGPL-3.0）的任何资产，对上游是运行时依赖而非再分发，故本层可自主选择许可。**打包两者一起分发会改变这一点**，详见 [`references/engine.md`](skills/ppt-maker/references/engine.md)。
