# 渲染引擎：guizang-ppt-skill（外部插件）

> **术语**：本仓库文档里 **上游 / 引擎 / 插件 / guizang-ppt-skill** 指同一件事 ——
> 那个负责渲染的开源项目。本 skill 是架在它之上的规范层。

本 skill 把上游当作**外部渲染引擎**来用，而不是把它的资产抄进来。分工很清楚：

| 层 | 归属 | 负责什么 |
|---|---|---|
| 渲染层 · 插件 | 上游 `guizang-ppt-skill` | 模板、CSS、动效、22 个 Sxx 版式、瑞士风静态校验 |
| 规范层 · 本体 | **本 skill** | 独立阅读铁律、页码体例、结构收敛、PDF 导出、子 Agent review |
| 口味层 | `references/taste.md` | 委托人明确表达过的喜欢与不喜欢 |

**我们不羞于承认这是站在上游肩膀上做的。** 上游是个很好的引擎，我们补的是它不负责的那一半 ——
"渲染出来之后，这东西**够不够格直接发给别人看**"。

---

## 一、致谢与身份卡

| 项 | 值 |
|---|---|
| 项目 | `guizang-ppt-skill` |
| 作者 | 歸藏（[@op7418](https://x.com/op7418)） |
| 仓库 | https://github.com/op7418/guizang-ppt-skill |
| 许可证 | **AGPL-3.0** |
| 支持方 | 360 安全龙虾（金牌赞助）、真格 Token Grant（Grant Supporter） |
| 默认安装位置 | `<SKILLS_DIR>/guizang-ppt-skill/`（本机一般是 `~/.cola/skills/`） |

> 上游的**赞助方信息不得出现在生成出来的 PPT 里** —— 这是上游的明文规定，照办。
> 生成出来的 PPT 是产出物，跟随委托人的意愿，不带上游的赞助标识。

---

## 二、许可证须知：为什么是"插件"而不是"合并"

**本 skill 不复制上游任何一行代码、任何一份模板或文档。** 运行时按路径读取已安装的上游目录，
把它的校验脚本当外部进程调用。

这么做有两个效果：

1. **合规干净** —— 本仓库分发的是自己的文档和脚本，对上游只是"使用"，不是"再分发"。
2. **上游更新能直接吃到** —— 不用手工同步 22 个版式，上游改了我们就跟着变。

⚠️ **一旦关系从"插件"变成"合并"，许可证要跟着变。** 如果将来要把两者打包成一个整体对外分发
（上架技能商店、塞进一个安装包、把上游模板复制进本仓库），那就构成衍生作品，
整体必须按 **AGPL-3.0** 授权，并保留上游署名与许可证全文。

反过来说：只要你保持"运行时读取上游、不复制其资产"，本 skill 自己的那层可以自主选择许可证。

---

## 三、上游文件地图（什么时候读哪个）

路径前缀省略，均在 `<SKILLS_DIR>/guizang-ppt-skill/`。

| 文件 | 作用 | 什么时候读 |
|---|---|---|
| `SKILL.md` | 上游主流程：7 问澄清、两种风格、模板拷贝、类名预检、主题节奏、自检清单 | **每次做 deck 都先读一遍** |
| `assets/template-swiss.html` | 风格 B · 瑞士国际主义模板（全可运行单文件） | 走瑞士风时拷成项目的 `index.html` |
| `assets/template.html` | 风格 A · 电子杂志风模板 | 走杂志风时用 |
| `assets/motion.min.js` | Motion One 本地副本（离线兜底） | 不用管，模板已引用 |
| `assets/screenshot-backgrounds/style-a\|b/*.webp` | 截图美化的内置背景资产 | 需要把用户截图做成 CleanShot 式画布时 |
| `references/swiss-layout-lock.md` | 瑞士风**版式锁**：正文页只能用登记的 Sxx | 走瑞士风时的**第一份**参考 |
| `references/layouts-swiss.md` | 22 个 Sxx 版式的骨架说明 + 少量实验区 | 挑版式时 |
| `references/layouts.md` | 风格 A 的 10 种布局骨架 | 走风格 A 时 |
| `references/themes-swiss.md` | 瑞士风 4 套主题色（IKB / 柠檬黄 / 柠檬绿 / 安全橙） | 定主题色时 |
| `references/themes.md` | 风格 A 5 套主题色 | 走风格 A 时 |
| `references/components.md` | 组件手册（字体、颜色、网格、图标、callout、动效） | 细节调整时 |
| `references/swiss-map-component.md` | `S08 + 地图` 扩展组件（MapLibre 点位/连线） | 需要地点/路线图时 |
| `references/image-prompts.md` | 配图类型、比例、基础提示词 | 要生成配图时 |
| `references/screenshot-framing.md` | 截图适配语义与背景资产映射 | 处理用户截图时 |
| `references/checklist.md` | 质量清单（P0–P3 分级），**真实迭代踩过的坑** | 生成后逐项对照 |
| `scripts/validate-swiss-deck.mjs` | 瑞士风静态校验（登记版式、图片槽位、SVG 文本、标题对齐） | 生成后必跑 |

---

## 四、加载顺序（上游要求 + 本 skill 追加）

1. 读上游 `SKILL.md` 了解整体。
2. **读本 skill 的 `references/taste.md`** —— 本 skill 独有的必读项，先建立口味标准。
3. 定风格：商业/信息密度型材料默认走 **风格 B 瑞士风 + IKB**。
4. 读上游 `references/themes-swiss.md` 选定主题色。
5. **读模板的 `<style>` 块** —— 类名的唯一来源，缺类会导致整页样式崩。
6. 读 `swiss-layout-lock.md` → `layouts-swiss.md`，挑 Sxx 版式，每页写 `data-layout="Sxx"`。
7. （需要时）读 `swiss-map-component.md` / `image-prompts.md` / `screenshot-framing.md`。
8. 生成后跑三个校验：`validate-swiss-deck.mjs` + `checklist.md` + **本 skill 的 `validate-ppt.mjs`**。
9. 起子 Agent 做 review（见 `reviewer-persona.md`）。
10. 导出 PDF 并打包（见 `export-and-package.md`）。

第 2、8、9、10 步是**本 skill 相对上游加的**，上游流程里没有。

---

## 五、上游已经有、我们直接沿用的规则

瑞士风部分（违反就掉到"普通 PowerPoint"）：单一强调色、无衬线只此一家、直角纯色
（禁渐变/阴影/圆角）、极致字号对比、大字号用 `min(Xvw, Yvh)` 双约束、大字字重 200、
卡片填充类型互斥、图标用 lucide 不自己画、时间线轴列固定宽度、每页一个语义化动效 recipe、
`[data-anim]` 容器先强制 `opacity:1`、保留 `B` 键低功耗模式。

模板机制：`canvas-card` 自带 padding 所以子元素不要再加水平 padding、
`data-animate` 必须命中已有 recipe 名、`#deck` 横向 transform 翻页。

这些**不重写、不覆盖**，直接用上游的定义。

---

## 六、本 skill 在上游之上加了什么

| 增量 | 内容 |
|---|---|
| 存在的理由 | "能独立阅读"这条判据：零背景读者只看这一页，能不能自己看懂 |
| 页码与页眉体例 | `NN — 中文章名` / `NN / MM`，目录固定第 2 页 |
| 更严的字号下限 | 上游对卡片描述放到 16px；本 skill 要求桌面业务信息 ≥ 18px、移动 ≥ 16px |
| 一页一个结构 | 禁止一页叠两个割裂结构 |
| 禁止底部孤立小字 | 附「收束条 vs 孤立小字」判定表 |
| 禁止英文 eyebrow / 未解释缩写 | 上游未约束，本 skill 列为 P0 |
| 列表型内容一律上表 | 上游无此要求 |
| 移动端不许 `display:none` 藏正文 | 上游无此要求 |
| 内容纪律 | 不丢信息、不乱强调未坐实数字、不出现真人姓名 |
| **子 Agent 扮演委托人 review** | 上游完全没有的机制性环节 |
| PDF 导出 + 三件套打包 | 上游只到 HTML 为止 |
| 机器可判定的自检脚本 | `validate-ppt.mjs` 把上面几条变成 exit code |

---

## 七、上游更新后怎么办

上游是活跃维护的开源项目（有赞助方持续投入）。它更新之后：

1. 重读上游 `SKILL.md` 的变更部分（尤其 22 个版式、字号阶梯、checklist）。
2. 检查本 skill 的覆盖规则有没有和上游新规则**冲突** —— 例如上游放宽或收紧了字号下限。
   冲突时以**本 skill 更严的那条**为准，但要在本文件里记一笔差异原因。
3. 两个校验器都重跑一遍：

   ```bash
   node <SKILL_ROOT>/scripts/validate-ppt.mjs 项目/xxx/ppt/index.html \
     --engine <SKILLS_DIR>/guizang-ppt-skill/scripts/validate-swiss-deck.mjs
   ```

4. 上游新增的版式如果更合适，**优先用上游的**，不要自己硬造结构。

查安装信息：

```bash
cat <SKILLS_DIR>/guizang-ppt-skill/.cola-skill.json
```
