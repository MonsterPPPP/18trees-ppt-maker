#!/usr/bin/env node
/**
 * export-pdf.mjs
 * 把横向翻页的网页 PPT 导出成「一页一张」的 PDF，并可选做三件套命名打包。
 *
 * 用法：
 *   node export-pdf.mjs <index.html> --out <out.pdf> [options]
 *
 * 选项：
 *   --out <path>        输出 PDF 路径（必填）
 *   --package <dir>     额外把 大纲md + HTML + PDF 复制进该文件夹（同前缀命名）
 *   --outline <path>    上面要复制的大纲 md
 *   --width <px>        幻灯片宽，默认 1440
 *   --height <px>       幻灯片高，默认 900
 *   --browser <path>    手动指定 Edge/Chrome 可执行文件
 *   --keep-temp         保留临时文件，便于排查
 *
 * 退出码：0 = 成功且页数校验通过；1 = 失败
 *
 * 原理与坑：见 ../references/export-and-package.md
 *
 * 许可证：MIT（见仓库根目录 LICENSE）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, basename, extname } from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''));
  process.exit(argv.length ? 0 : 1);
}

const htmlPath = resolve(argv[0]);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const outPdf = opt('--out');
const packageDir = opt('--package');
const outlinePath = opt('--outline');
const W = parseInt(opt('--width', '1440'), 10);
const H = parseInt(opt('--height', '900'), 10);
const keepTemp = argv.includes('--keep-temp');

if (!existsSync(htmlPath)) fail(`找不到输入文件：${htmlPath}`);
if (!outPdf) fail('必须用 --out 指定输出 PDF 路径');

function fail(msg) { console.error(`❌ ${msg}`); process.exit(1); }

// ---------- 1. 找浏览器 ----------
function findBrowser(explicit) {
  const candidates = [];
  if (explicit) candidates.push(explicit);
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);

  if (process.platform === 'win32') {
    candidates.push(
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    );
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  } else {
    candidates.push('/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  // 最后试 PATH
  for (const name of ['msedge', 'google-chrome', 'chromium', 'chrome']) {
    try {
      const r = spawnSync(name, ['--version'], { encoding: 'utf8' });
      if (r.status === 0) return name;
    } catch { /* ignore */ }
  }
  return null;
}

const browser = findBrowser(opt('--browser'));
if (!browser) fail('找不到 Edge/Chrome。用 --browser <可执行文件路径> 指定。');
console.log(`浏览器：${browser}`);

// ---------- 2. 统计页数 ----------
const html = readFileSync(htmlPath, 'utf8');
const slideCount = (html.match(/<section class="slide[\s\S]*?<\/section>/g) || []).length;
if (!slideCount) fail('文件里没有 <section class="slide …">，不是有效的 deck。');
console.log(`幻灯片：${slideCount} 页`);

// ---------- 3. 注入打印覆盖样式 ----------
const PRINT_CSS = `
<style id="ppt-maker-print">
@media print {
  html,body{width:auto!important;height:auto!important;overflow:visible!important;margin:0!important;padding:0!important;}
  #bg-grid,#hint,#nav,.ascii-bg,canvas{display:none!important;}
  *{animation:none!important;transition:none!important;opacity:1!important;}
  #deck{position:static!important;width:auto!important;height:auto!important;display:block!important;
        transform:none!important;transition:none!important;overflow:visible!important;}
  .slide{position:relative!important;width:${W}px!important;height:${H}px!important;flex:none!important;
         break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid;
         overflow:hidden!important;padding:0!important;margin:0!important;}
}
</style>
`;

// 注入到最后一个 </style> 之后（必须在主样式之后才生效）
const lastStyleEnd = html.lastIndexOf('</style>');
if (lastStyleEnd === -1) fail('文件里找不到 </style>，无法注入打印样式。');
const patched = html.slice(0, lastStyleEnd + '</style>'.length) + PRINT_CSS + html.slice(lastStyleEnd + '</style>'.length);

const tmpDir = join(tmpdir(), `ppt-maker-${Date.now()}`);
mkdirSync(tmpDir, { recursive: true });
const tmpHtml = join(tmpDir, 'print.html');
writeFileSync(tmpHtml, patched, 'utf8');

// ---------- 4. 打印 PDF ----------
mkdirSync(dirname(resolve(outPdf)), { recursive: true });
const outAbs = resolve(outPdf);
const fileUrl = 'file:///' + tmpHtml.replace(/\\/g, '/').replace(/^\//, '');

const INCH_W = (W / 96).toFixed(4);   // 1440px @96dpi = 15in
const INCH_H = (H / 96).toFixed(4);   // 900px @96dpi = 9.375in

const args = [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${outAbs}`,
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=9000',
  `--paper-width=${INCH_W}`,
  `--paper-height=${INCH_H}`,
  '--print-color-adjust=exact',
  '--no-sandbox',
  fileUrl,
];

console.log(`打印中（纸张 ${INCH_W}in × ${INCH_H}in）…`);
const r = spawnSync(browser, args, { encoding: 'utf8', timeout: 180000 });
if (!existsSync(outAbs)) {
  console.error(r.stderr || '');
  fail('PDF 没有生成。检查浏览器路径、纸张参数，或加 --keep-temp 后手动排查。');
}

// ---------- 5. 校验页数 ----------
// 注意：不要用 PDF 页树的 /Count 判页数，它可能只是中间节点的计数。
const buf = readFileSync(outAbs);
const pageObjects = (buf.toString('latin1').match(/\/Type\s*\/Page(?![s])/g) || []).length;
const kb = (statSync(outAbs).size / 1024).toFixed(0);

console.log(`输出：${outAbs}  (${kb} KB)`);
console.log(`页数：${pageObjects}（期望 ${slideCount}）`);

if (pageObjects !== slideCount) {
  console.log('⚠️  页数与幻灯片数不一致 —— 常见原因见 references/export-and-package.md「已知坑」。');
} else {
  console.log('✅ 页数校验通过：每张幻灯片一页。');
}

// ---------- 6. 打包三件套 ----------
if (packageDir) {
  const dir = resolve(packageDir);
  mkdirSync(dir, { recursive: true });

  const pdfName = basename(outAbs);
  const pm = pdfName.match(/^(.*?)-PDF版\.pdf$/i);
  const prefix = pm ? pm[1] : pdfName.replace(/\.pdf$/i, '');
  const finalHtmlName = `${prefix}-HTML版.html`;

  copyFileSync(htmlPath, join(dir, finalHtmlName));
  console.log(`打包：${join(dir, finalHtmlName)}`);

  if (outlinePath && existsSync(outlinePath)) {
    // 大纲保留原文件名（版本号是它的身份证，不要剥掉）
    const on = basename(outlinePath);
    copyFileSync(resolve(outlinePath), join(dir, on));
    console.log(`打包：${join(dir, on)}`);
  } else if (outlinePath) {
    console.log(`⚠️  --outline 指向的文件不存在：${outlinePath}`);
  }

  copyFileSync(outAbs, join(dir, pdfName));
  console.log(`打包：${join(dir, pdfName)}`);

  const files = readdirSync(dir).map(f => `  ${f}  (${(statSync(join(dir, f)).size / 1024).toFixed(0)} KB)`);
  console.log(`\n交付文件夹 ${dir}：\n${files.join('\n')}`);
  console.log('\n提醒：三件套必须同前缀、同文件夹；交付前人工翻一遍 PDF 的最密页。');
}

// ---------- 7. 清理 ----------
if (!keepTemp) {
  try {
    for (const f of readdirSync(tmpDir)) unlinkSync(join(tmpDir, f));
    execSync(`rmdir "${tmpDir}"`, { stdio: 'ignore' });
  } catch { /* 清理失败不影响结果 */ }
}

process.exit(pageObjects === slideCount ? 0 : 1);
