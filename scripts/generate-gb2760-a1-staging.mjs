import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const defaultPdfPath = '/home/downloads/git/docs/GB_2760-2024_食品安全国家标准　食品添加剂使用标准.pdf';
const pdfPath = process.argv[2] ? resolve(process.argv[2]) : defaultPdfPath;
const outputPath = process.argv[3]
  ? resolve(process.argv[3])
  : resolve('src/data/gb2760OfficialGeneratedA1Staging.js');

const pdfPageStart = 8;
const pdfPageEnd = 148;
const generatedAt = '2026-06-13';
const extractionTool = 'pdftotext -bbox-layout (poppler-utils)';
const generatedRecordCorrections = [
  {
    pdfPage: 16,
    additiveNameCn: 'ε-聚赖氨酸盐酸盐',
    foodCategoryCode: '04.0',
    maxUseLevel: '0.30',
    foodCategoryName: '水果、蔬菜(包括块根类)、豆类、食用菌、藻类、坚果以及籽类等(04.01.01鲜水果、04.01.02.04水果罐头、04.02.01新鲜蔬菜、04.02.02.01冷冻蔬菜、04.02.02.04蔬菜罐头、04.02.02.06发酵蔬菜制品、04.03.01新鲜食用菌和藻类、04.03.02.01冷冻食用菌和藻类、04.03.02.04食用菌和藻类罐头、04.05.02.03坚果与籽类罐头除外)'
  },
  {
    pdfPage: 16,
    additiveNameCn: 'ε-聚赖氨酸盐酸盐',
    foodCategoryCode: '06.02',
    maxUseLevel: '0.25',
    foodCategoryName: '大米及其制品'
  },
  {
    pdfPage: 16,
    additiveNameCn: 'ε-聚赖氨酸盐酸盐',
    foodCategoryCode: '06.03',
    maxUseLevel: '0.30',
    foodCategoryName: '小麦粉及其制品[06.03.01小麦粉、06.03.02.01生湿面制品(如面条、饺子皮、馄饨皮、烧麦皮)、06.03.02.02生干面制品除外]'
  },
  {
    pdfPage: 52,
    additiveNameCn: '红曲米,红曲红',
    foodCategoryCode: '08.03',
    maxUseLevel: '按生产需要适量使用',
    foodCategoryName: '熟肉制品'
  },
  {
    pdfPage: 52,
    additiveNameCn: '红曲米,红曲红',
    foodCategoryCode: '10.03',
    maxUseLevel: '按生产需要适量使用',
    foodCategoryName: '蛋制品(改变其物理性状)[10.03.01脱水蛋制品(如蛋白粉、蛋黄粉、蛋白片)、10.03.03蛋液与液态蛋除外]'
  },
  {
    pdfPage: 63,
    additiveNameCn: '聚甘油脂肪酸酯',
    foodCategoryCode: '07.0',
    maxUseLevel: '10.0',
    foodCategoryName: '焙烤食品'
  },
  {
    pdfPage: 63,
    additiveNameCn: '聚甘油脂肪酸酯',
    foodCategoryCode: '12.0',
    maxUseLevel: '10.0',
    foodCategoryName: '调味品(12.01盐及代盐制品、12.09香辛料类除外)(仅限用于膨化食品的调味料)'
  },
  {
    pdfPage: 110,
    additiveNameCn: '司盘类[包括山梨醇酐单月桂酸酯(又名司盘20),山梨醇酐单棕榈酸酯(又名司盘40),山梨醇酐单硬脂酸酯(又名司盘60),山梨醇酐三硬脂酸酯(又名司盘65),山梨醇酐单油酸酯(又名司盘80)]',
    foodCategoryCode: '01.05',
    maxUseLevel: '10.0',
    foodCategoryName: '稀奶油(淡奶油)及其类似品(01.05.01稀奶油除外)'
  },
  {
    pdfPage: 110,
    additiveNameCn: '司盘类[包括山梨醇酐单月桂酸酯(又名司盘20),山梨醇酐单棕榈酸酯(又名司盘40),山梨醇酐单硬脂酸酯(又名司盘60),山梨醇酐三硬脂酸酯(又名司盘65),山梨醇酐单油酸酯(又名司盘80)]',
    foodCategoryCode: '02.0',
    maxUseLevel: '15.0',
    foodCategoryName: '脂肪、油和乳化脂肪制品[02.01.01.01植物油、02.01.02动物油脂(包括猪油、牛油、鱼油和其他动物脂肪等)、02.01.03无水黄油、无水乳脂、02.02.01.01黄油和浓缩黄油除外]'
  },
  {
    pdfPage: 110,
    additiveNameCn: '司盘类[包括山梨醇酐单月桂酸酯(又名司盘20),山梨醇酐单棕榈酸酯(又名司盘40),山梨醇酐单硬脂酸酯(又名司盘60),山梨醇酐三硬脂酸酯(又名司盘65),山梨醇酐单油酸酯(又名司盘80)]',
    foodCategoryCode: '02.01.01.02',
    maxUseLevel: '10.0',
    foodCategoryName: '氢化植物油'
  }
];

const records = extractA1Rows();
const fileContent = `export const gb2760OfficialGeneratedA1Coverage = {
  extractionTool: ${JSON.stringify(extractionTool)},
  extractionScope: 'table_a1_generated_row_staging',
  generatedAt: ${JSON.stringify(generatedAt)},
  pdfPageStart: ${pdfPageStart},
  pdfPageEnd: ${pdfPageEnd},
  generatedRowCount: ${records.length}
};

export const gb2760OfficialGeneratedA1StagingRecords = ${JSON.stringify(records, null, 2)};
`;

writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Generated ${records.length} GB 2760 Table A.1 staging rows at ${outputPath}`);

function extractA1Rows() {
  const rows = [];
  const rowKeys = new Set();
  const pageRowCounts = new Map();
  let currentAdditive = {
    additiveNameCn: '',
    additiveNameEn: '',
    cnsNumber: '',
    insNumber: '',
    functionText: ''
  };
  let pendingHeaderLines = [];
  let inTable = false;
  let tableSegment = null;

  function finishTableSegment() {
    if (!tableSegment) return;

    const rowStartLines = tableSegment.lines.filter(isRowStartLine);
    const groups = rowStartLines.map((start) => ({ start, lines: [start] }));
    const otherLines = tableSegment.lines.filter((line) => (
      !isRowStartLine(line) && !isJunkLine(line) && !isTableHeaderLine(line)
    ));

    for (const line of otherLines) {
      if (!groups.length) continue;
      let bestGroup = groups[0];
      let bestDistance = Math.abs(line.mid - groups[0].start.mid);
      for (const group of groups) {
        const distance = Math.abs(line.mid - group.start.mid);
        if (distance < bestDistance) {
          bestGroup = group;
          bestDistance = distance;
        }
      }
      if (bestDistance < 42) bestGroup.lines.push(line);
    }

    for (const group of groups) {
      const lines = group.lines.slice().sort((a, b) => a.mid - b.mid);
      const foodCategoryCode = group.start.codeText;
      const foodCategoryName = cleanText(columnText(lines, 130, 300));
      const maxUseLevelRaw = cleanText(
        lines
          .flatMap((line) => line.words.filter((word) => word.x >= 300 && word.x < 390))
          .sort((a, b) => a.x - b.x || a.y - b.y)
          .map((word) => word.text)
          .join('')
      );
      const note = normalizeNote(columnText(lines, 390, 560));
      const { maxUseLevel, unit } = normalizeMaxUseLevel(maxUseLevelRaw, tableSegment.unitHint);

      if (!currentAdditive.additiveNameCn || !currentAdditive.functionText) continue;
      if (!foodCategoryCode || !foodCategoryName || !maxUseLevel) continue;

      const key = canonicalRecordKey({
        additiveNameCn: currentAdditive.additiveNameCn,
        foodCategoryCode,
        foodCategoryName,
        maxUseLevel,
        unit,
        note
      });
      if (rowKeys.has(key)) continue;
      rowKeys.add(key);

      const pageRowNumber = (pageRowCounts.get(tableSegment.pdfPage) || 0) + 1;
      pageRowCounts.set(tableSegment.pdfPage, pageRowNumber);

      let record = {
        id: `gb2760-2024-a1-generated-p${String(tableSegment.pdfPage).padStart(3, '0')}-r${String(pageRowNumber).padStart(3, '0')}`,
        ingredientId: '',
        additiveNameCn: currentAdditive.additiveNameCn,
        additiveNameEn: currentAdditive.additiveNameEn,
        cnsNumber: currentAdditive.cnsNumber,
        insNumber: currentAdditive.insNumber,
        functionText: currentAdditive.functionText,
        foodCategoryCode,
        foodCategoryName,
        maxUseLevel,
        unit,
        note,
        pdfPage: tableSegment.pdfPage,
        standardPage: tableSegment.pdfPage - 3,
        extractionStatus: 'extracted',
        reviewStatus: 'needs_review'
      };
      record = applyGeneratedRecordCorrection(record);
      record.rawSourceText = [
        `GB 2760-2024 表 A.1：${record.additiveNameCn}`,
        record.additiveNameEn,
        record.cnsNumber ? `CNS号 ${record.cnsNumber}` : '',
        record.insNumber ? `INS号 ${record.insNumber}` : '',
        `功能 ${record.functionText}`,
        `${record.foodCategoryCode} ${record.foodCategoryName}`,
        `最大使用量 ${record.maxUseLevel}${record.unit ? ` ${record.unit}` : ''}`,
        record.note
      ].filter(Boolean).join('；') + '。';
      rows.push(record);
    }

    tableSegment = null;
  }

  for (let pdfPage = pdfPageStart; pdfPage <= pdfPageEnd; pdfPage += 1) {
    const lines = parsePdfPage(pdfPage);
    for (const line of lines) {
      const isHeaderContinuation = isHeaderContinuationLine(line, pendingHeaderLines);
      if (line.mid < 100 || (isJunkLine(line) && !isHeaderContinuation)) continue;

      if (line.text.includes('CNS号')) {
        finishTableSegment();
        inTable = false;
        const additiveNameCn = extractAdditiveName(pendingHeaderLines);
        if (additiveNameCn) currentAdditive = { ...currentAdditive, additiveNameCn };
        currentAdditive = { ...currentAdditive, ...parseCnsIns(line) };
        pendingHeaderLines = [];
        continue;
      }

      if (line.text.startsWith('功能')) {
        currentAdditive = {
          ...currentAdditive,
          functionText: cleanText(line.text.replace(/^功能/u, ''))
        };
        continue;
      }

      if (isTableHeaderLine(line)) {
        finishTableSegment();
        pendingHeaderLines = [];
        inTable = true;
        tableSegment = {
          pdfPage,
          unitHint: line.text.includes('g/kg') ? 'g/kg' : line.text.includes('g/L') ? 'g/L' : '',
          lines: []
        };
        continue;
      }

      if (isHeaderContinuation) {
        finishTableSegment();
        pendingHeaderLines.push(line);
        inTable = false;
        continue;
      }

      if (isHeaderCandidateLine(line)) {
        finishTableSegment();
        pendingHeaderLines = inTable ? [line] : [...pendingHeaderLines, line];
        inTable = false;
        continue;
      }

      if (inTable && tableSegment) {
        tableSegment.lines.push(line);
      } else if (/[\u4e00-\u9fff]/u.test(line.text) && !isFootnoteTextLine(line)) {
        pendingHeaderLines.push(line);
      }
    }
    finishTableSegment();
  }

  return rows;
}

function applyGeneratedRecordCorrection(record) {
  const correction = generatedRecordCorrections.find((item) => (
    item.pdfPage === record.pdfPage
    && item.additiveNameCn === record.additiveNameCn
    && item.foodCategoryCode === record.foodCategoryCode
    && item.maxUseLevel === record.maxUseLevel
  ));
  return correction ? { ...record, ...correction } : record;
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
    line.words.sort((a, b) => a.x - b.x);
    line.text = joinWords(line.words);
    line.leftText = joinWords(line.words.filter((word) => word.x < 130));
    line.codeWords = line.words.filter((word) => (
      word.x < 130 && /^(?:\d{1,2}\.?|\d\)|—)$/u.test(word.text)
    ));
    line.codeText = normalizeFoodCategoryCode(
      joinWords(line.codeWords.filter((word) => !/^\d\)$/u.test(word.text)))
    );
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
  return words.map((word) => word.text).join('').replace(/\s+/g, '').replace(/，/g, ',').trim();
}

function columnText(lines, minX, maxX) {
  return lines
    .slice()
    .sort((a, b) => a.mid - b.mid)
    .map((line) => joinWords(line.words.filter((word) => word.x >= minX && word.x < maxX)))
    .filter(Boolean)
    .join('');
}

function normalizeFoodCategoryCode(value) {
  let code = cleanText(value).replace(/2\)$/u, '');
  let previous;
  do {
    previous = code;
    code = code.replace(/(\.\d{2})(\d{2})(?=\.|$)/gu, '$1.$2');
  } while (code !== previous);
  return code;
}

function isValidFoodCategoryCode(value) {
  return value === '—' || /^(?:0[1-9]|1[0-6])\.(?:\d{1,2}\.?)*\d*$/u.test(value);
}

function isRowStartLine(line) {
  if (!line.codeText || !isValidFoodCategoryCode(line.codeText)) return false;
  const minX = Math.min(...line.codeWords.map((word) => word.x));
  return minX < 90 || line.codeText === '—';
}

function isTableHeaderLine(line) {
  return line.text.includes('食品分类号')
    && line.text.includes('食品名称')
    && line.text.includes('最大使用量');
}

function isJunkLine(line) {
  return (line.mid > 740 && /^\d{1,3}$/u.test(line.text))
    || line.text === 'GB2760—2024'
    || /^表A\.1(?:\(续\))?$/u.test(line.text)
    || line.text === '表A.'
    || line.text.includes('食品添加剂的允许使用品种')
    || /^\d+[)）]/u.test(line.leftText);
}

function isHeaderCandidateLine(line) {
  if (isJunkLine(line) || isTableHeaderLine(line)) return false;
  if (isFootnoteTextLine(line)) return false;
  if (line.text.includes('CNS号') || line.text.startsWith('功能')) return false;
  if (isRowStartLine(line)) return false;

  const hasLeftNonCodeWord = line.words.some((word) => (
    word.x < 130 && !/^(?:\d{1,2}\.?|\d\)|—)$/u.test(word.text)
  ));
  return hasLeftNonCodeWord && /[\u4e00-\u9fff]/u.test(line.leftText);
}

function isHeaderContinuationLine(line, pendingHeaderLines) {
  if (!pendingHeaderLines.length || isTableHeaderLine(line)) return false;
  if (isFootnoteTextLine(line)) return false;
  if (line.text.includes('CNS号') || line.text.startsWith('功能')) return false;
  if (isRowStartLine(line)) return false;

  const pendingTitle = pendingHeaderLines.map(headerLineText).join('');
  if (!hasOpenTitleContinuation(pendingTitle)) return false;

  const titleText = headerLineText(line);
  if (!titleText) return false;

  const hasLeftTitleWord = line.words.some((word) => (
    word.x < 130 && !/^(?:\d{1,2}\.?|\d\)|—)$/u.test(word.text)
  ));
  return hasLeftTitleWord && /[\u4e00-\u9fffA-Za-zαβγδεΔ0-9'()[\]（）“”+\-,]/u.test(titleText);
}

function extractAdditiveName(lines) {
  const parts = [];
  for (const line of lines) {
    if (line.text.includes('食品分类号')) continue;
    const text = headerLineText(line);
    if (/[\u4e00-\u9fffA-Za-zαβγδεΔ0-9'()+\-,]/u.test(text)) parts.push(text);
  }
  return cleanAdditiveName(parts.join(''));
}

function headerLineText(line) {
  return joinWords(line.words.filter((word) => word.x < 255));
}

function hasOpenTitleContinuation(value) {
  const text = cleanText(value);
  return countMatches(text, /[(（[{]/gu) > countMatches(text, /[)）\]}]/gu)
    || countMatches(text, /“/gu) > countMatches(text, /”/gu)
    || /[-{[]$/u.test(text);
}

function countMatches(value, pattern) {
  return [...String(value || '').matchAll(pattern)].length;
}

function isFootnoteTextLine(line) {
  const text = headerLineText(line);
  return /^(?:若|当|时[,，]?|量[,，)]|添加该添加剂)/u.test(text);
}

function cleanAdditiveName(value) {
  let name = stripTrailingFootnoteMarkers(cleanText(value).replace(/^表A\.1(?:\(续\))?/u, ''));
  if (/[\u4e00-\u9fff]/u.test(name)) {
    name = name.replace(/([\u4e00-\u9fff）》）])(?:[a-z]{1,8}|[αβγδε])$/u, '$1');
  }
  return stripTrailingFootnoteMarkers(name);
}

function parseCnsIns(line) {
  const text = cleanText(line.text);
  return {
    cnsNumber: text.match(/CNS号([^I功能]+)/u)?.[1] || '',
    insNumber: text.match(/INS号(.+)/u)?.[1] || ''
  };
}

function normalizeMaxUseLevel(value, unitHint) {
  const raw = cleanText(value);
  if (raw.includes('按生产需要适量使用')) {
    return { maxUseLevel: '按生产需要适量使用', unit: '' };
  }

  const unit = /mg\/kg/iu.test(raw)
    ? 'mg/kg'
    : /g\/L/u.test(raw)
      ? 'g/L'
      : /g\/kg/iu.test(raw)
        ? 'g/kg'
        : unitHint || '';
  const maxUseLevel = raw.replace(/(?:mg\/kg|g\/kg|g\/L)/giu, '').replace(/[，,]/g, '.');
  return { maxUseLevel: maxUseLevel || raw, unit };
}

function normalizeNote(value) {
  return cleanText(value).replace(/,/g, '，');
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, '').replace(/，/g, ',').trim();
}

function canonicalRecordKey(record) {
  return [
    canonicalText(record.additiveNameCn),
    record.foodCategoryCode,
    canonicalText(record.foodCategoryName),
    canonicalText(record.maxUseLevel),
    record.unit,
    canonicalText(record.note)
  ].join('|');
}

function canonicalText(value) {
  return stripTrailingFootnoteMarkers(String(value || '')
    .replace(/\s+/g, '')
    .replace(/[，,]/g, ',')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[。；;]/g, '')
    .trim())
    .toLowerCase();
}

function stripTrailingFootnoteMarkers(value) {
  return String(value || '').replace(/([^\d])\d+\)$/u, '$1');
}
