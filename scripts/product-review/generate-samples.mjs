import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const round = Number.parseInt(process.argv.find((arg) => arg.startsWith('--round='))?.split('=')[1] || '1', 10);
const baseDir = `reports/product-review/fixtures/round-${round}`;
const samplesDir = join(baseDir, 'samples');
const publicSamplesDir = join(baseDir, 'public-samples');
const publicCatalogPath = join(baseDir, 'sample-catalog-public.json');

const samples = [
  {
    id: 'clear-ingredients-orange-drink',
    type: 'clear_ingredients',
    title: '橙味饮料清晰配料表',
    taskFit: ['single_product_decision', 'children', 'sugar_control'],
    lines: [
      '橙味饮料',
      '配料表：水、白砂糖、果葡糖浆、浓缩橙汁、柠檬酸、三氯蔗糖、安赛蜜、山梨酸钾、食用香精。',
      '营养成分表 每100ml：能量190kJ 蛋白质0g 脂肪0g 碳水化合物11.2g 糖10.8g 钠36mg。',
      '致敏原提示：本品可能含有微量牛奶和大豆成分。'
    ],
    palette: ['#fff7e6', '#ed8a19', '#623b10']
  },
  {
    id: 'clear-nutrition-yogurt',
    type: 'clear_nutrition',
    title: '原味酸奶清晰营养成分表',
    taskFit: ['single_product_decision', 'allergy', 'comparison'],
    lines: [
      '原味酸奶',
      '配料表：生牛乳、乳酸菌。',
      '营养成分表 每100g：能量280kJ 蛋白质3.4g 脂肪3.2g 碳水化合物4.8g 糖4.8g 钠55mg。',
      '致敏原提示：含有牛奶。'
    ],
    palette: ['#eef9ff', '#1873a6', '#113d59']
  },
  {
    id: 'front-only-cereal-bar',
    type: 'front_only',
    title: '只有商品正面',
    taskFit: ['insufficient_information'],
    lines: [
      '谷物能量棒',
      '高纤维 低负担',
      '25g x 6条',
      '未展示配料表或营养成分表'
    ],
    palette: ['#f7f4ea', '#6d8f42', '#2f3e1d']
  },
  {
    id: 'barcode-only',
    type: 'barcode',
    title: '商品条形码区域',
    taskFit: ['barcode', 'insufficient_information'],
    lines: [
      '商品条码',
      '6901234567892'
    ],
    palette: ['#ffffff', '#111111', '#222222'],
    barcode: true
  },
  {
    id: 'qr-digital-label',
    type: 'qrcode',
    title: '数字标签二维码区域',
    taskFit: ['qrcode', 'insufficient_information'],
    lines: [
      '数字标签二维码',
      `https://example.test/food-label/round-${round}`
    ],
    palette: ['#ffffff', '#0d6b58', '#17332b'],
    qrcode: true
  },
  {
    id: 'blurry-glare-tilted',
    type: 'blur_tilt_glare',
    title: '模糊倾斜反光配料表',
    taskFit: ['failure_recovery'],
    lines: [
      '配料表：水、白砂糖、麦芽糊精、柠檬酸、食用香精。',
      '营养成分表 每100ml：能量160kJ 碳水化合物9.5g 糖9.1g 钠42mg。',
      '此样本带有倾斜和反光，用于观察失败恢复。'
    ],
    palette: ['#f5f5f5', '#727272', '#222222'],
    noisy: true
  },
  {
    id: 'no-label-plain-package',
    type: 'no_label',
    title: '无配料表图片',
    taskFit: ['insufficient_information', 'failure_recovery'],
    lines: [
      '纯色包装正面',
      '没有食品标签文字',
      '没有配料表',
      '没有营养成分表'
    ],
    palette: ['#e7ede9', '#698378', '#263631']
  },
  {
    id: 'compare-drink-a-high-sugar',
    type: 'compare_a',
    title: '高糖乳酸菌饮料',
    taskFit: ['comparison', 'sugar_control', 'children'],
    lines: [
      '高糖乳酸菌饮料',
      '配料表：水、白砂糖、全脂乳粉、果葡糖浆、乳酸菌、食用香精、三氯蔗糖。',
      '营养成分表 每100ml：能量260kJ 蛋白质1.0g 脂肪1.2g 碳水化合物13.6g 糖12.8g 钠68mg。',
      '致敏原提示：含有牛奶。'
    ],
    palette: ['#fff2f2', '#d34545', '#5d1d1d']
  },
  {
    id: 'compare-drink-b-low-sugar',
    type: 'compare_b',
    title: '低糖酸奶饮品',
    taskFit: ['comparison', 'sugar_control', 'children'],
    lines: [
      '低糖酸奶饮品',
      '配料表：生牛乳、水、乳酸菌、赤藓糖醇、菊粉。',
      '营养成分表 每100ml：能量155kJ 蛋白质2.8g 脂肪1.5g 碳水化合物4.2g 糖3.1g 钠42mg。',
      '致敏原提示：含有牛奶。'
    ],
    palette: ['#eefaf5', '#16846b', '#17382f']
  }
];

await mkdir(samplesDir, { recursive: true });
await mkdir(publicSamplesDir, { recursive: true });

const manifest = {
  schemaVersion: 'product-review-samples-v1',
  round,
  generatedAt: new Date().toISOString(),
  note: 'Synthetic but realistic food-package label images for black-box product review. They are test fixtures, not proof of real-world OCR quality.',
  coverageGap: 'True camera capture, true device interaction, and real OCR visual accuracy are not validated by these fixtures.',
  samples: []
};
const publicCatalog = {
  schemaVersion: 'product-review-public-sample-catalog-v2',
  round,
  generatedAt: manifest.generatedAt,
  note: 'Opaque sample files for black-box review. Names and IDs do not disclose expected page behavior.',
  samples: []
};

for (const [index, sample] of samples.entries()) {
  const svgFileName = `${sample.id}.svg`;
  const pngFileName = `${sample.id}.png`;
  const svgPath = join(samplesDir, svgFileName);
  const path = join(samplesDir, pngFileName);
  const publicId = `sample-${String(index + 1).padStart(2, '0')}`;
  const publicSvgPath = join(publicSamplesDir, `${publicId}.svg`);
  const publicPath = join(publicSamplesDir, `${publicId}.png`);
  const svg = renderSvg(sample);
  await writeFile(svgPath, svg, 'utf8');
  await writeFile(publicSvgPath, svg, 'utf8');
  await renderPng(svgPath, path);
  await renderPng(publicSvgPath, publicPath);
  manifest.samples.push({
    id: sample.id,
    publicId,
    title: sample.title,
    type: sample.type,
    taskFit: sample.taskFit,
    path,
    expectedVisibleText: sample.lines
  });
  publicCatalog.samples.push({
    id: publicId,
    title: `样本 ${String(index + 1).padStart(2, '0')}`,
    path: publicPath
  });
}

await writeFile(join(baseDir, 'sample-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(publicCatalogPath, `${JSON.stringify(publicCatalog, null, 2)}\n`, 'utf8');
console.log(`Generated ${samples.length} product-review sample images at ${samplesDir}`);
console.log(`Public black-box sample catalog written: ${publicCatalogPath}`);

async function renderPng(inputPath, outputPath) {
  await execFileAsync('convert', ['-background', 'white', '-font', 'WenQuanYi-Micro-Hei', inputPath, outputPath], {
    timeout: 15_000,
    maxBuffer: 1_000_000
  });
}

function renderSvg(sample) {
  const [bg, accent, text] = sample.palette;
  const filter = sample.noisy ? '<filter id="soft-blur"><feGaussianBlur stdDeviation="1.2" /></filter>' : '';
  const angle = sample.noisy ? ' transform="rotate(-5 450 320)" filter="url(#soft-blur)"' : '';
  const glare = sample.noisy ? '<path d="M80 120 L820 30 L860 110 L120 230 Z" fill="#fff" opacity="0.48"/>' : '';
  const rows = renderTextRows(sample.lines, text);
  const barcode = sample.barcode ? renderBarcode() : '';
  const qrcode = sample.qrcode ? renderQr() : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640" viewBox="0 0 900 640">
  <defs>
    ${filter}
    <style>
      text { font-family: "WenQuanYi Micro Hei", "Droid Sans Fallback", Arial, sans-serif; letter-spacing: 0; }
    </style>
  </defs>
  <rect width="900" height="640" rx="42" fill="${bg}"/>
  <rect x="38" y="38" width="824" height="564" rx="28" fill="#fff" stroke="${accent}" stroke-width="6"/>
  <g${angle}>
    <rect x="58" y="64" width="784" height="86" rx="18" fill="${accent}" opacity="0.14"/>
    ${rows}
    ${barcode}
    ${qrcode}
  </g>
  ${glare}
</svg>
`;
}

function renderBarcode() {
  const widths = [5, 2, 4, 2, 6, 3, 2, 5, 2, 4, 7, 2, 3, 6, 2, 5, 2, 3, 4, 6, 2, 4, 3, 2, 7, 4, 2, 5];
  let x = 104;
  const bars = widths.map((width, index) => {
    const bar = index % 2 === 0 ? `<rect x="${x}" y="240" width="${width * 4}" height="170" fill="#111"/>` : '';
    x += width * 4;
    return bar;
  }).join('');
  return `<g>${bars}<text x="104" y="452" font-size="28" font-weight="700" fill="#111">6901234567892</text></g>`;
}

function renderQr() {
  const cells = [
    [0, 0], [1, 0], [2, 0], [4, 0], [6, 0], [7, 0], [8, 0],
    [0, 1], [2, 1], [3, 1], [5, 1], [6, 1], [8, 1],
    [0, 2], [1, 2], [2, 2], [5, 2], [6, 2], [7, 2], [8, 2],
    [1, 3], [4, 3], [6, 3],
    [0, 4], [2, 4], [3, 4], [4, 4], [8, 4],
    [1, 5], [3, 5], [5, 5], [7, 5],
    [0, 6], [1, 6], [2, 6], [4, 6], [6, 6], [7, 6], [8, 6],
    [0, 7], [2, 7], [5, 7], [8, 7],
    [0, 8], [1, 8], [2, 8], [3, 8], [6, 8], [8, 8]
  ];
  const size = 26;
  const x0 = 106;
  const y0 = 220;
  const squares = cells.map(([x, y]) => `<rect x="${x0 + x * size}" y="${y0 + y * size}" width="${size - 3}" height="${size - 3}" fill="#111"/>`).join('');
  return `<g><rect x="${x0 - 16}" y="${y0 - 16}" width="${size * 9 + 29}" height="${size * 9 + 29}" fill="#fff" stroke="#111" stroke-width="3"/>${squares}<text x="106" y="500" font-size="23" font-weight="700" fill="#17332b">扫码查看数字标签</text></g>`;
}

function renderTextRows(lines, textColor) {
  let y = 138;
  const rows = [];
  lines.forEach((line, index) => {
    const title = index === 0;
    const chunks = wrapText(line, title ? 24 : 31);
    chunks.forEach((chunk, chunkIndex) => {
      const size = title ? 34 : 24;
      const weight = title || chunkIndex === 0 ? 800 : 600;
      rows.push(`<text x="76" y="${y}" font-size="${size}" font-weight="${weight}" fill="${textColor}">${escapeXml(chunk)}</text>`);
      y += title ? 58 : 42;
    });
    y += title ? 12 : 18;
  });
  return rows.join('\n');
}

function wrapText(value, maxChars) {
  const chars = Array.from(String(value));
  const lines = [];
  for (let index = 0; index < chars.length; index += maxChars) {
    lines.push(chars.slice(index, index + maxChars).join(''));
  }
  return lines.length ? lines : [''];
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
