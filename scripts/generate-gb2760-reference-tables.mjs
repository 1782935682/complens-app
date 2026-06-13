import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const defaultPdfPath = '/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf';
const pdfPath = process.argv[2] ? resolve(process.argv[2]) : defaultPdfPath;
const outputPath = process.argv[3]
  ? resolve(process.argv[3])
  : resolve('src/data/gb2760OfficialReferenceTables.js');

const generatedAt = '2026-06-13';
const extractionTool = 'pdftotext -bbox-layout (poppler-utils)';
const a2PdfPageStart = 149;
const a2PdfPageEnd = 150;
const a2TableTitle = '表 A.1 中例外食品编号对应的食品类别';
const b1PdfPage = 152;
const b1TableTitle = '不得添加食品用香料、香精的食品名单';
const b1Footnotes = {
  a: {
    text: '较大婴儿和幼儿配方食品中可以使用香兰素、乙基香兰素和香荚兰豆浸膏(提取物),最大使用量分别为5 mg/100 mL、5 mg/100 mL和按照生产需要适量使用,其中100 mL以即食食品计,生产企业应按照冲调比例折算成配方食品中的使用量;婴幼儿谷类辅助食品中可以使用香兰素,最大使用量为7 mg/100g,其中100g以即食食品计,生产企业应按照冲调比例折算成谷类食品中的使用量;凡使用范围涵盖0~6个月婴幼儿配方食品不得添加任何食用香料。',
    exceptionUses: [
      {
        foodCategoryCode: '13.01.02',
        foodCategoryName: '较大婴儿和幼儿配方食品',
        flavorName: '香兰素',
        maxUseLevel: '5 mg/100 mL',
        useBasis: '100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量'
      },
      {
        foodCategoryCode: '13.01.02',
        foodCategoryName: '较大婴儿和幼儿配方食品',
        flavorName: '乙基香兰素',
        maxUseLevel: '5 mg/100 mL',
        useBasis: '100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量'
      },
      {
        foodCategoryCode: '13.01.02',
        foodCategoryName: '较大婴儿和幼儿配方食品',
        flavorName: '香荚兰豆浸膏(提取物)',
        maxUseLevel: '按生产需要适量使用',
        useBasis: '100 mL以即食食品计，生产企业应按照冲调比例折算成配方食品中的使用量'
      },
      {
        foodCategoryCode: '13.02.01',
        foodCategoryName: '婴幼儿谷类辅助食品',
        flavorName: '香兰素',
        maxUseLevel: '7 mg/100g',
        useBasis: '100g以即食食品计，生产企业应按照冲调比例折算成谷类食品中的使用量'
      }
    ],
    residualRestriction: '凡使用范围涵盖0~6个月婴幼儿配方食品不得添加任何食用香料'
  }
};

const a2Rows = extractA2Rows();
if (a2Rows.length !== 68) {
  throw new Error(`Expected 68 Table A.2 rows, got ${a2Rows.length}`);
}
const b1Rows = extractB1Rows();
if (b1Rows.length !== 29) {
  throw new Error(`Expected 29 Table B.1 rows, got ${b1Rows.length}`);
}

const fileContent = `import { gb2760OfficialStagingSource } from './gb2760OfficialStaging.js';

export const gb2760OfficialReferenceTableSource = {
  ...gb2760OfficialStagingSource,
  extractionTool: ${JSON.stringify(extractionTool)},
  extractionScope: 'official_reference_tables_structured',
  generatedAt: ${JSON.stringify(generatedAt)}
};

export const gb2760OfficialA2ExceptionFoodCategories = ${JSON.stringify(a2Rows, null, 2)};

export const gb2760OfficialB1NoFlavorFoodCategories = ${JSON.stringify(b1Rows, null, 2)};

export const gb2760OfficialB1Footnotes = ${JSON.stringify(b1Footnotes, null, 2)};

const gb2760OfficialA2ReferenceRows = gb2760OfficialA2ExceptionFoodCategories.map((row) => ({
  ...gb2760OfficialReferenceTableSource,
  id: row.id,
  tableName: '表 A.2',
  tableTitle: ${JSON.stringify(a2TableTitle)},
  rowNumber: row.exceptionNumber,
  rowCode: String(row.exceptionNumber),
  rowName: row.foodCategoryName,
  rowData: {
    exceptionNumber: row.exceptionNumber,
    foodCategoryCode: row.foodCategoryCode,
    foodCategoryName: row.foodCategoryName
  },
  pdfPage: row.pdfPage,
  standardPage: row.standardPage,
  rawSourceText: row.rawSourceText,
  extractionStatus: 'extracted',
  reviewStatus: 'needs_review'
}));

const gb2760OfficialB1ReferenceRows = gb2760OfficialB1NoFlavorFoodCategories.map((row) => {
  const footnote = row.footnoteMarker ? gb2760OfficialB1Footnotes[row.footnoteMarker] : undefined;
  return {
    ...gb2760OfficialReferenceTableSource,
    id: row.id,
    tableName: '表 B.1',
    tableTitle: ${JSON.stringify(b1TableTitle)},
    rowNumber: row.rowNumber,
    rowCode: row.foodCategoryCode,
    rowName: row.foodCategoryName,
    rowData: {
      foodCategoryCode: row.foodCategoryCode,
      foodCategoryName: row.foodCategoryName,
      flavorUseRestriction: footnote ? 'no_added_food_flavor_with_footnote_exceptions' : 'no_added_food_flavor',
      footnoteMarker: row.footnoteMarker,
      ...(footnote ? { footnote } : {})
    },
    pdfPage: row.pdfPage,
    standardPage: row.standardPage,
    rawSourceText: row.rawSourceText,
    extractionStatus: 'extracted',
    reviewStatus: 'needs_review'
  };
});

export const gb2760OfficialReferenceRows = [
  ...gb2760OfficialA2ReferenceRows,
  ...gb2760OfficialB1ReferenceRows
];

export function getGb2760OfficialReferenceTableSummary() {
  return {
    totalRows: gb2760OfficialReferenceRows.length,
    a2ExceptionFoodCategoryCount: gb2760OfficialA2ExceptionFoodCategories.length,
    b1NoFlavorFoodCategoryCount: gb2760OfficialB1NoFlavorFoodCategories.length,
    tableNames: [...new Set(gb2760OfficialReferenceRows.map((row) => row.tableName))],
    pdfPages: [...new Set(gb2760OfficialReferenceRows.map((row) => row.pdfPage))].sort((a, b) => a - b)
  };
}
`;

writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Generated ${a2Rows.length + b1Rows.length} GB 2760 reference table rows at ${outputPath}`);

function extractA2Rows() {
  const rows = [];
  for (let pdfPage = a2PdfPageStart; pdfPage <= a2PdfPageEnd; pdfPage += 1) {
    const lines = parsePdfPage(pdfPage);
    const rowStarts = lines
      .flatMap((line) => line.words.map((word) => ({ ...word, mid: line.mid })))
      .filter((word) => word.x < 100 && /^\d{1,2}\.$/u.test(word.text) && word.mid > 140 && word.mid < 780)
      .map((word) => ({ number: Number(word.text.replace('.', '')), mid: word.mid }))
      .sort((a, b) => a.mid - b.mid);

    for (let index = 0; index < rowStarts.length; index += 1) {
      const start = rowStarts[index];
      const next = rowStarts[index + 1];
      const lowerBound = start.mid - 14;
      const upperBound = next ? next.mid - 14 : 770;
      const rowLines = lines.filter((line) => line.mid >= lowerBound && line.mid < upperBound);
      const code = normalizeFoodCategoryCode(joinWords(rowLines.flatMap((line) => (
        line.words.filter((word) => word.x >= 170 && word.x < 260)
      ))));
      const foodCategoryName = cleanText(joinWords(rowLines.flatMap((line) => (
        line.words.filter((word) => word.x >= 270 && word.x < 540)
      ))));

      if (!code || !foodCategoryName) continue;

      const row = {
        id: `gb2760-2024-a2-exception-${String(start.number).padStart(3, '0')}`,
        exceptionNumber: start.number,
        foodCategoryCode: code,
        foodCategoryName,
        pdfPage,
        standardPage: pdfPage - 3
      };
      rows.push({
        ...row,
        rawSourceText: `GB 2760-2024 表 A.2：例外食品类别编号 ${row.exceptionNumber}；食品分类号 ${row.foodCategoryCode}；食品名称 ${row.foodCategoryName}。`
      });
    }
  }
  return rows;
}

function extractB1Rows() {
  const rows = [];
  const lines = parsePdfPage(b1PdfPage);
  const tableLines = lines.filter((line) => line.mid >= 150 && line.mid < 680);

  for (const line of tableLines) {
    const codeWords = line.words.filter((word) => word.x >= 70 && word.x < 130);
    const nameWords = line.words.filter((word) => word.x >= 160 && word.x < 460);
    const code = normalizeFoodCategoryCode(joinWords(codeWords));
    const footnoteMarker = nameWords.some((word) => word.text === 'a' && word.x > 220) ? 'a' : '';
    const foodCategoryName = cleanText(joinWords(nameWords.filter((word) => !(word.text === 'a' && word.x > 220))));

    if (!/^\d{2}(?:\.\d{2})*$/u.test(code) || !foodCategoryName) continue;

    const row = {
      id: `gb2760-2024-b1-no-flavor-${String(rows.length + 1).padStart(3, '0')}`,
      rowNumber: rows.length + 1,
      foodCategoryCode: code,
      foodCategoryName,
      footnoteMarker,
      pdfPage: b1PdfPage,
      standardPage: b1PdfPage - 3
    };
    rows.push({
      ...row,
      rawSourceText: formatSourceSentence([
        `GB 2760-2024 表 B.1：食品分类号 ${row.foodCategoryCode}`,
        `食品名称 ${row.foodCategoryName}`,
        '不得添加食品用香料、香精',
        row.footnoteMarker ? `脚注 ${row.footnoteMarker}：${b1Footnotes[row.footnoteMarker]?.text || ''}` : ''
      ])
    });
  }

  return rows;
}

function parsePdfPage(pdfPage) {
  const result = spawnSync('pdftotext', [
    '-f',
    String(pdfPage),
    '-l',
    String(pdfPage),
    '-bbox-layout',
    pdfPath,
    '-'
  ], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });

  if ((!result.stdout || result.stdout.length === 0) && (result.error || result.status !== 0)) {
    throw result.error || new Error(result.stderr || `pdftotext exited with status ${result.status}`);
  }

  const words = [...result.stdout.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([\s\S]*?)<\/word>/g)]
    .map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      xMax: Number(match[3]),
      yMax: Number(match[4]),
      text: decodeXml(match[5])
    }));

  const lines = [];
  for (const word of words) {
    const mid = (word.y + word.yMax) / 2;
    let line = lines.find((item) => Math.abs(item.mid - mid) < 3.5);
    if (!line) {
      line = { mid, words: [] };
      lines.push(line);
    }
    line.words.push(word);
  }

  lines.sort((a, b) => a.mid - b.mid);
  for (const line of lines) {
    line.words.sort((a, b) => a.y - b.y || a.x - b.x);
  }
  return lines;
}

function decodeXml(value) {
  const entities = {
    lt: '<',
    gt: '>',
    amp: '&',
    quot: '"',
    apos: "'"
  };
  return String(value).replace(/&(lt|gt|amp|quot|apos);/g, (match, entity) => entities[entity] || match);
}

function joinWords(words) {
  return words
    .slice()
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((word) => word.text)
    .join('');
}

function normalizeFoodCategoryCode(value) {
  return cleanText(value).replace(/\.$/u, '');
}

function cleanText(value) {
  return String(value || '').replace(/\s+/gu, '').replace(/，/g, ',').trim();
}

function formatSourceSentence(parts) {
  const text = parts.filter(Boolean).join('；');
  return text.endsWith('。') ? text : `${text}。`;
}
