# AGENTS.md

给 AI 编程助手看的安装与维护说明。

## 这个仓库是什么

一个跨工具 AI skill：从素材做到可直接发给别人看的网页 PPT 与 PDF。

- **规则源文件**：`skills/ppt-maker/`
- **运行时依赖**：上游 [`guizang-ppt-skill`](https://github.com/op7418/guizang-ppt-skill)（AGPL-3.0）必须已安装在本机

## 安装这个 skill

### Claude Code

项目级：把 `skills/ppt-maker/` 复制到项目的 `.claude/skills/`。
用户级：复制到 `~/.claude/skills/`。

或走插件市场：

```bash
/plugin marketplace add MonsterPPPP/18trees-ppt-maker
/plugin install ppt-maker@18trees-ppt-maker
```

### OpenAI Codex

项目级：复制到 `.codex/skills/`。用户级：复制到 `~/.codex/skills/`。

### 装之前先确认引擎在位

```bash
ls <SKILLS_DIR>/guizang-ppt-skill/SKILL.md
ls <SKILLS_DIR>/guizang-ppt-skill/assets/template-swiss.html
```

两项都在才能用。缺了先装上游。

### ⚠️ 不适用：网页版聊天机器人

**ChatGPT / Gemini / DeepSeek / Kimi / 豆包 的网页版没有工具能力，跑不了本 skill。**

本 skill 需要读写文件、执行两个 Node 脚本（静态校验 + 驱动 headless 浏览器导出 PDF）。没有工具能力的模型只能凭空编一份 deck，做不到校验和导出。

所以**不要**把它推荐给纯聊天机器人场景。判断标准：skill 需不需要执行命令或访问文件系统。

### 本仓库不提供 `dist/` 单文件版

本组织其他 skill 会额外提供一份"可粘贴给 chatbot"的单文件版。**这个不提供，因为它做不到**：第 4 阶段和第 6 阶段是两个真实的 Node 脚本，一段粘贴的文本带不动。

## ⚠️ 不要破坏与上游的插件边界（改动前必读）

**本仓库不包含上游的任何代码、模板或文档资产。**

不要把上游的模板 / CSS / 动效 / Sxx 版式 / 校验脚本复制进本仓库；不要把两者打成单一分发物。理由不是洁癖，是**许可证**：本仓库对上游是运行时依赖而非再分发，这个前提是本层能选 MIT 的唯一理由。一旦合并分发，整体必须转 AGPL-3.0。

## 修改规则时

新反馈的处理顺序固定：

1. 先追加到 `references/taste.md`（保留原话 + 日期 + 轮次）
2. 再判断是否升格成 `SKILL.md` 的 P0 铁律
3. 能机器判定的，同步写进 `scripts/validate-ppt.mjs`

## 验证改动

```bash
node scripts/validate-ppt.mjs <一个真实的 deck.html>
```

- 校验器的新规则必须能暴露真实失败，附正反例
- 改了 `reviewer-persona.md` 的 prompt 模板，说明实际跑过没有；没跑过就写"未实测"
- 涉及页面结构的改动，两个视口都要看：桌面 `1440×900` + 移动 `390×844`
