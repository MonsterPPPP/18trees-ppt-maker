#!/usr/bin/env node
/**
 * validate-ppt.mjs
 * 「可独立阅读的网页 PPT」静态校验器
 *
 * 用法：
 *   node validate-ppt.mjs <index.html> [options]
 *
 * 选项：
 *   --engine <path>     顺带运行渲染引擎（guizang-ppt-skill）的 validate-swiss-deck.mjs
 *   --upstream <path>   --engine 的旧名，等价
 *   --names a,b,c       额外禁止出现的人名（默认读取同目录 forbidden-names.txt）
 *   --json              以 JSON 输出结果
 *
 * 退出码：0 = 无 error；1 = 有 error（warning 不影响退出码）
 *
 * 说明：本脚本只做静态检查，不能替代「起子 Agent 做独立阅读 review」，
 *      也不能替代人在浏览器/PDF 里逐页看。它负责拦掉可机器判定的低级问题。
 *
 * 许可证：MIT（见仓库根目录 LICENSE）
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);

if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
  process.exit(argv.length ? 0 : 1);
}

const htmlPath = resolve(argv[0]);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const upstreamPath = opt('--engine') || opt('--upstream');
const asJson = argv.includes('--json');

// ---------- 禁止出现的英文 eyebrow / 内部提示词 ----------
const FORBIDDEN_LABELS = [
  'WHY NOW', 'WHY ME', 'WHY US', 'SEED', 'TRACTION', 'TAKEAWAYS', 'TAKEAWAY',
  'NEXT', 'INPUT', 'ONE PAGE THESIS', 'BEFORE / AFTER', 'BEFORE/AFTER',
  'THE BRIDGE', 'BLACK PEARL GUIDE', 'PRIVATE BANKING CRM', 'HUMAN-IN-THE-LOOP',
  'WHO WE SERVE FIRST', 'REVENUE × GROWTH', 'AI-NATIVE DOUBLE FLYWHEEL',
  'INVESTOR FIELD NOTE', 'THE PROBLEM', 'THE SOLUTION', 'MARKET SIZE',
  'BUSINESS MODEL', 'GO TO MARKET', 'TEAM', 'ROADMAP', 'CONCLUSION',
];

// ---------- 占位符 ----------
const PLACEHOLDERS = ['[必填]', 'TODO:', 'Lorem ipsum', '占位符', 'placeholder-text', 'XXXX'];

// ---------- 人名 ----------
const namesFile = join(__dirname, 'forbidden-names.txt');
let forbiddenNames = [];
if (existsSync(namesFile)) {
  forbiddenNames = readFileSync(namesFile, 'utf8')
    .split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
}
const extraNames = (opt('--names', '') || '').split(',').map(s => s.trim()).filter(Boolean);
forbiddenNames = [...new Set([...forbiddenNames, ...extraNames])];

// ================= 工具 =================
const errors = [];
const warnings = [];
const err = (check, page, msg, detail) => errors.push({ check, page, msg, detail });
const warn = (check, page, msg, detail) => warnings.push({ check, page, msg, detail });
const stripTags = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** 从 <div 开始，找到与之配对的 </div> 结束位置 */
function findMatchingDivEnd(html, startIdx) {
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = startIdx;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('</')) {
      depth--;
      if (depth === 0) return m.index + m[0].length;
    } else depth++;
  }
  return -1;
}

// ================= 读取 =================
if (!existsSync(htmlPath)) {
  console.error(`找不到文件：${htmlPath}`);
  process.exit(1);
}
const htmlRaw = readFileSync(htmlPath, 'utf8');
// HTML 注释不是给读者看的文案，先剥掉，避免注释里的说明文字被误判
const html = htmlRaw.replace(/<!--[\s\S]*?-->/g, '');

// ================= 切分页面 =================
const slideRe = /<section class="slide[\s\S]*?<\/section>/g;
const slides = html.match(slideRe) || [];
if (!slides.length) {
  console.error('没有找到任何 <section class="slide …">，文件结构不对。');
  process.exit(1);
}

const inventory = [];

slides.forEach((slideHtml, i) => {
  const pageNo = i + 1;
  const tag = `P${String(pageNo).padStart(2, '0')}`;

  // ---- 1. 页眉体例 ----
  const chromeL = slideHtml.match(/<div class="l">([\s\S]*?)<\/div>/);
  const chromeR = slideHtml.match(/<div class="r">([\s\S]*?)<\/div>/);
  const label = chromeL ? stripTags(chromeL[1]) : '';
  const pageTag = chromeR ? stripTags(chromeR[1]) : '';
  inventory.push({ page: pageNo, label: label || '(无)', pageTag: pageTag || '(无)' });

  if (i > 0) {
    if (!chromeL) err('页眉体例', tag, '缺页眉左侧章名（chrome-min .l）');
    if (!chromeR) err('页眉体例', tag, '缺页眉右侧页码（chrome-min .r）');

    const m = label.match(/^(\d{2})\s*[—\-–]\s*(.+)$/);
    if (label && !m) {
      err('页眉体例', tag, '页眉章名不是「NN — 中文章名」格式', label);
    } else if (m && Number(m[1]) !== pageNo) {
      err('页眉体例', tag, `页眉编号与页序不一致（写的 ${m[1]}，实际第 ${pageNo} 页）`);
    } else if (m && /^[\x00-\x7F\s]+$/.test(m[2])) {
      err('英文标签', tag, '页眉章名是纯英文，应改成中文结论', m[2]);
    }

    const pm = pageTag.match(/^(\d{2})\s*\/\s*(\d{2})$/);
    if (pageTag && !pm) {
      err('页码体例', tag, '页眉页码不是「NN / MM」格式', pageTag);
    } else if (pm) {
      if (Number(pm[1]) !== pageNo) err('页码体例', tag, `页码与页序不一致（写的 ${pm[1]}，实际第 ${pageNo} 页）`);
      if (Number(pm[2]) !== slides.length) err('页码体例', tag, `总页数写的是 ${pm[2]}，文件里实际有 ${slides.length} 页`);
    }
  }

  // ---- 2. 英文 eyebrow / 内部提示词 ----
  const upper = slideHtml.toUpperCase();
  for (const bad of FORBIDDEN_LABELS) {
    if (upper.includes(bad)) err('英文标签', tag, `出现禁止的英文标签「${bad}」`, bad);
  }
  // t-cat / t-meta / .l 里纯 ASCII 大写内容
  const labelSlots = [...slideHtml.matchAll(/<(?:div|span)[^>]*class="[^"]*(?:t-cat|t-meta)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/g)];
  for (const s of labelSlots) {
    const t = stripTags(s[1]);
    if (t && /^[A-Z0-9\s&/×·\-—:]+$/.test(t) && /[A-Z]{3,}/.test(t)) {
      err('英文标签', tag, `小标题/装饰标签是纯英文大写，读者看不懂：${t}`, t);
    }
  }

  // ---- 3. 占位符 ----
  for (const p of PLACEHOLDERS) {
    if (slideHtml.includes(p)) err('占位符', tag, `存在未替换的占位符「${p}」`);
  }

  // ---- 4. 字号 ----
  for (const m of slideHtml.matchAll(/font-size\s*:\s*([^;"']+)/g)) {
    const decl = m[1].trim();

    // 响应式大字：带 min(Xvw,…) 且系数 ≥ 3（1440px 下 ≥ 43px），
    // 其中的 16px 只是小屏下限，不是桌面排版字号 → 跳过
    const vwBig = decl.match(/min\(\s*(\d*\.?\d+)vw/);
    if (vwBig && parseFloat(vwBig[1]) >= 3) continue;

    // 表头（<th>）属于「结构性标签」档，下限 14px
    const before = slideHtml.slice(Math.max(0, m.index - 400), m.index);
    const inTh = before.lastIndexOf('<th') > before.lastIndexOf('</th>');

    const pxVals = [...decl.matchAll(/(\d+(?:\.\d+)?)px/g)].map(x => parseFloat(x[1]));
    if (pxVals.length) {
      const smallest = Math.min(...pxVals);
      const floor = inTh ? 14 : 18;
      if (smallest < 14) {
        err('字号', tag, `字号 ${smallest}px 太小（硬下限 14px）`, decl);
      } else if (smallest < floor) {
        warn('字号', tag,
          `字号下限 ${smallest}px。若这是表头/编号/meta 这类结构性标签（下限 14px）可放行；` +
          `若是给读者看的业务文字，必须放大（删文案 / 拆页 / 换版式）`, decl);
      }
    } else {
      // 只有 vw/vh 的写法：1440px 宽下 1vw = 14.4px
      const vw = decl.match(/(\d*\.?\d+)vw/);
      if (vw && parseFloat(vw[1]) < 1.25) {
        warn('字号', tag, `只有 vw 约束且系数 ${vw[1]}vw（1440px 下约 ${(parseFloat(vw[1]) * 14.4).toFixed(1)}px），没有 px 下限保护`, decl);
      }
    }
  }

  // ---- 5. 底部孤立小字 ----
  const inner = slideHtml.replace(/<\/section>$/, '');
  let divIdx = -1;
  const divStarts = [];
  while ((divIdx = inner.indexOf('<div', divIdx + 1)) !== -1) divStarts.push(divIdx);

  for (const start of divStarts) {
    const openEnd = inner.indexOf('>', start);
    if (openEnd === -1) continue;
    const openTag = inner.slice(start, openEnd + 1);
    if (!/border-top/.test(openTag)) continue;

    const end = findMatchingDivEnd(inner, start);
    if (end === -1) continue;

    // 必须是该页最后一个内容元素
    const rest = inner.slice(end).trim();
    if (!/^(<\/div>\s*)*$/.test(rest)) continue;

    const seg = inner.slice(start, end);
    const text = stripTags(seg);
    if (text.length > 200) continue;
    // 有这些就是「有主体内容」的收束块，不算孤立小字
    const hasStructure = /<table|<h2|<h3|class="t-body"|class="t-body-emp"|class="lead"|grid-template-columns\s*:\s*repeat\((?:[3-9]|1[0-2])|class="card-/.test(seg);
    if (hasStructure) continue;

    err('底部孤立小字', tag,
      '页面最底部是一条脱离主线的孤立小字（border-top + 短文本），必须融入主体或删掉',
      text.slice(0, 120));
  }

  // ---- 6. 未解释的缩写（软提示）----
  // 判定：可见文案里出现的全大写缩写，前后 20 字内没有中文术语陪衬 → 提示
  // 例外："中文术语（ABBR）" 这种括号注解法算已解释；少量通用词直接放行
  const ABBR_OK = new Set(['AI', 'PDF', 'HTML', 'PPT', 'URL', 'API', 'ID', 'OK', 'CDN', 'CPU', 'GPU']);
  const textOnly = stripTags(slideHtml);
  const seenAbbr = new Set();
  for (const m of textOnly.matchAll(/(?<![A-Za-z])([A-Z]{2,8})(?![A-Za-z])/g)) {
    const abbr = m[1];
    if (ABBR_OK.has(abbr) || seenAbbr.has(abbr)) continue;
    const before = textOnly.slice(Math.max(0, m.index - 20), m.index);
    const after = textOnly.slice(m.index + abbr.length, m.index + abbr.length + 20);
    // 后面紧跟中文 / 前面有中文术语 → 视为已解释
    if (/[\u4e00-\u9fa5]/.test(before) || /[\u4e00-\u9fa5]/.test(after)) continue;
    seenAbbr.add(abbr);
    warn('缩写', tag, `缩写「${abbr}」附近没有中文解释，读者可能看不懂`);
  }

  // ---- 7. 未坐实的具体数字（软提示）----
  for (const m of slideHtml.matchAll(/(\d+)\s*位[^。；，<]{0,8}(?:转化|付费|用户|客户|成交)/g)) {
    warn('数字口径', tag, `出现具体位数「${m[0]}」，确认是否该改成定性表述`);
  }

  // ---- 8. 真实人名 ----
  for (const n of forbiddenNames) {
    if (slideHtml.includes(n)) err('人名', tag, `出现禁止出现的真实人名「${n}」`);
  }
});

// ---- 9. 移动端隐藏正文 ----
const mediaBlocks = html.match(/@media[^{]*\{[\s\S]*?\n\s*\}/g) || [];
for (const block of mediaBlocks) {
  for (const m of block.matchAll(/([^{}]*?)\{[^{}]*display\s*:\s*none[^{}]*\}/g)) {
    const sel = m[1].trim();
    if (!sel) continue;
    // chrome-min 是模板级的页眉结构（上游在移动端会收起它），不算业务正文
    const decorative = /#?bg-grid|#nav|#hint|canvas|ascii|chrome-min|\.bg\b/.test(sel);
    if (decorative) continue;
    warn('移动端', '全局', `媒体查询里对「${sel}」设了 display:none，确认不是在藏业务内容（不许藏正文）`);
  }
}

// ================= 输出 =================
const group = (arr) => arr.reduce((acc, x) => ((acc[x.check] ||= []).push(x), acc), {});
/** 同页同类同细节的重复项合并，只报一次并标出次数（否则 12 个一样的字号警告会淹掉真问题） */
const dedupe = (arr) => {
  const map = new Map();
  for (const x of arr) {
    const k = `${x.check}|${x.page}|${x.msg}|${x.detail || ''}`;
    if (map.has(k)) map.get(k).count++;
    else map.set(k, { ...x, count: 1 });
  }
  return [...map.values()];
};
const errorsU = dedupe(errors);
const warningsU = dedupe(warnings);

if (asJson) {
  console.log(JSON.stringify({ file: htmlPath, slides: slides.length, inventory, errors, warnings }, null, 2));
} else {
  console.log(`\n文件：${htmlPath}`);
  console.log(`页数：${slides.length}\n`);

  console.log('页面清单：');
  for (const it of inventory) {
    console.log(`  P${String(it.page).padStart(2, '0')}  ${it.pageTag.padEnd(10)}  ${it.label}`);
  }

  if (errorsU.length) {
    console.log(`\n❌ Error（${errorsU.length} 类 / 共 ${errors.length} 处）—— 必修，不修不能交付：`);
    for (const [check, list] of Object.entries(group(errorsU))) {
      console.log(`\n  [${check}]`);
      for (const e of list) console.log(`    ${e.page}  ${e.msg}${e.count > 1 ? `（×${e.count}）` : ''}${e.detail ? `\n         → ${e.detail}` : ''}`);
    }
  }

  if (warningsU.length) {
    console.log(`\n⚠️  Warning（${warningsU.length} 类 / 共 ${warnings.length} 处）—— 逐条确认，不是自动可忽略：`);
    for (const [check, list] of Object.entries(group(warningsU))) {
      console.log(`\n  [${check}]`);
      for (const w of list) console.log(`    ${w.page}  ${w.msg}${w.count > 1 ? `（×${w.count}）` : ''}${w.detail ? `\n         → ${w.detail}` : ''}`);
    }
  }

  if (!errorsU.length && !warningsU.length) console.log('\n✅ 静态校验全部通过。');

  console.log('\n提醒：静态校验过了 ≠ 能交付。');
  console.log('必须再执行两步：① 起子 Agent 做「扮演委托人」的独立阅读 review（references/reviewer-persona.md）');
  console.log('              ② 桌面 1440×900 / 移动 390×844 逐页目视。');
}

// ---- 10. 顺带跑上游校验 ----
if (upstreamPath) {
  const up = resolve(upstreamPath);
  if (existsSync(up)) {
    console.log(`\n—— 上游校验：${up} ——`);
    const r = spawnSync(process.execPath, [up, htmlPath], { stdio: 'inherit' });
    if (r.status !== 0) console.log('（上游校验返回非零，按上游说明逐条确认）');
  } else {
    console.log(`\n（--engine 指向的脚本不存在：${up}）`);
  }
}

process.exit(errors.length ? 1 : 0);
