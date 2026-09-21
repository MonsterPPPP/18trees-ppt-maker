# 导出 PDF 与打包交付

## 一、交付物形态

一次交付永远是**三件套，同一个文件夹，同一前缀**：

```
交付物/
├── <材料名>-vN.md          ← 叙事大纲（可编辑源，后续迭代改这份）
├── <材料名>-HTML版.html    ← 网页 PPT（可翻页演示，也能当网页发）
└── <材料名>-PDF版.pdf      ← PDF（发给别人看的那一份）
```

命名只说结果，不加日期后缀也行，但三份必须同前缀、同文件夹 —— 委托人明确要求
"三个文件命名好，打包到一个文件夹中"。

一条命令搞定：

```bash
node <SKILL_ROOT>/scripts/export-pdf.mjs <项目>/ppt/index.html \
  --out <项目>/<材料名>-PDF版.pdf \
  --package <项目>/交付物 \
  --outline <项目>/<材料名>-vN.md
```

---

## 二、为什么不能直接 `--print-to-pdf`

上游模板的 deck 是这样排的：

```css
#deck { position: fixed; inset: 0; width: 10000vw; display: flex; flex-wrap: nowrap;
        transform: translateX(...); }   /* 靠 transform 翻页 */
.slide { width: 100vw; height: 100vh; flex: 0 0 100vw; }
```

14 页横排在一个 `10000vw` 宽的 `position:fixed` 容器里，靠 `transform` 移动。
直接打印的后果：**只有 1 页，且只有第一页的内容** —— 其余全在视口外。

所以必须注入一份打印专用的覆盖样式，把"横向 transform 播放器"还原成"纵向文档"。

---

## 三、可用的打印覆盖样式

注入到主 `<style>` **之后**（顺序很重要，否则被主样式覆盖）：

```html
<style>
@media print {
  html,body{width:auto!important;height:auto!important;overflow:visible!important;margin:0!important;padding:0!important;}
  #bg-grid,#hint,#nav,.ascii-bg,canvas{display:none!important;}
  * { animation:none !important; transition:none !important; opacity:1 !important; }
  #deck{position:static!important;width:auto!important;height:auto!important;display:block!important;
        transform:none!important;transition:none!important;overflow:visible!important;}
  .slide{position:relative!important;width:1440px!important;height:900px!important;flex:none!important;
         break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid;
         overflow:hidden!important;padding:0!important;margin:0!important;}
}
</style>
```

四个关键点：

| 点 | 为什么 |
|---|---|
| `#deck` 改成 `static + block` | 打散横向播放器，让 slide 纵向堆叠 |
| `.slide` 定死 `1440×900` | `100vh` 在打印媒体里语义不稳，必须给绝对尺寸 |
| `break-after:page` + `break-inside:avoid` | 一页一张，且不被从中间切开 |
| `*{opacity:1}` | 入场动效从 `opacity:0` 起步，不强制会印出空白页 |

---

## 四、headless 命令与纸张尺寸

```bash
msedge --headless --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf=<out.pdf> \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=9000 \
  --paper-width=15 --paper-height=9.375 \
  --print-color-adjust=exact \
  "file:///.../index.html"
```

- **`--paper-width=15 --paper-height=9.375`（英寸）**：1440/96 = 15in，900/96 = 9.375in。
  等于把纸张设成 slide 的精确尺寸，1:1 输出不变形。用默认 A4 会被缩放并重新分页。
- **`--print-color-adjust=exact`**：不加的话 accent 色块（IKB 蓝底）会被打印引擎省墨处理成白底。
- **`--virtual-time-budget`**：给字体/图标/CDN 资源留加载时间。
- **`--run-all-compositor-stages-before-draw`**：等布局稳定再出图。

Windows 上 Edge 一般在
`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`；
macOS 用 Chrome/Edge 的 `--headless=new`。`export-pdf.mjs` 会自动找。

---

## 五、验证导出结果（必做）

**不要靠文件大小判断**。用 PDF 里的页对象数量数页：

```bash
# 应该等于 slide 数量
grep -c "/Type /Page[^s]" out.pdf     # 近似；脚本里用正则精确匹配
```

⚠️ **陷阱**：PDF 页树里的 `/Count N` **不是总页数**，它可能只是某个中间节点的计数。
曾出现 `/Count 8` 而实际 14 页的情况 —— 按 `/Count` 判会误判成"分页失败"，
然后白白重做。**只信 `/Type /Page` 的对象数**。

`export-pdf.mjs` 会自动做这个校验，并把结果打出来（`pages=14 expected=14 ✅`）。

---

## 六、已知坑

| 坑 | 症状 | 解法 |
|---|---|---|
| 直接打印只有 1 页 | `/Type /Page` 只有 1 个 | 注入上面的 `@media print` 覆盖样式 |
| 空白页 | 页数对但内容是白的 | `*{opacity:1}` 强制；动画起始态是 `opacity:0` |
| accent 色丢失 | IKB 蓝印成白 | 加 `--print-color-adjust=exact` |
| 版面被缩放 | 页边留白、内容变小 | 用 `--paper-width/height` 精确匹配 1440×900 |
| 打印样式不生效 | 覆盖无效 | 注入位置必须在主 `<style>` **之后** |
| 文件读不出来 / 写不进去 | 句柄被占 | 先杀掉遗留的 headless 浏览器进程再操作 |
| 逐页截图全空白 | `?slide=N` 在 headless 下不稳 + 动效未完成 | 要逐页视觉核对就注入 `*{animation:none;transition:none;opacity:1!important}`，或直接看导出的 PDF |

---

## 七、交付前最后一眼

导出后至少人工翻一遍 PDF，重点看**内容最密的页**（大表格页、多层卡片页）：

- 表格有没有被切到下一页
- 最后一行有没有被页底裁掉
- 深色页的对比度是否还在
- 页码是否连续、与页数一致

打印引擎的字体替换（离线时 Google Fonts 降级）会让行高与网页版有细微差异 ——
差异在字形，不该在布局。若布局变了，说明是版式本身太挤，回 Step 3 减内容。
