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

      const record = {
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
      if (line.mid < 100 || isJunkLine(line)) continue;

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
        inTable = true;
        tableSegment = {
          pdfPage,
          unitHint: line.text.includes('g/kg') ? 'g/kg' : line.text.includes('g/L') ? 'g/L' : '',
          lines: []
        };
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
      } else if (/[\u4e00-\u9fff]/u.test(line.text)) {
        pendingHeaderLines.push(line);
      }
    }
    finishTableSegment();
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
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
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
  return cleanText(value).replace(/2\)$/u, '');
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
  if (line.text.includes('CNS号') || line.text.startsWith('功能')) return false;
  if (isRowStartLine(line)) return false;

  const hasLeftNonCodeWord = line.words.some((word) => (
    word.x < 130 && !/^(?:\d{1,2}\.?|\d\)|—)$/u.test(word.text)
  ));
  return hasLeftNonCodeWord && /[\u4e00-\u9fff]/u.test(line.leftText);
}

function extractAdditiveName(lines) {
  const parts = [];
  for (const line of lines) {
    if (isJunkLine(line) || line.text.includes('食品分类号')) continue;
    const text = joinWords(line.words.filter((word) => word.x < 255));
    if (/[\u4e00-\u9fffA-Za-zαβγδεΔ0-9'()+\-,]/u.test(text)) parts.push(text);
  }
  return cleanAdditiveName(parts.join(''));
}

function cleanAdditiveName(value) {
  let name = cleanText(value).replace(/^表A\.1(?:\(续\))?/u, '');
  if (/[\u4e00-\u9fff]/u.test(name)) {
    name = name.replace(/([\u4e00-\u9fff）》）])(?:[a-z]{1,8}|[αβγδε])$/u, '$1');
  }
  return name;
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
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[，,]/g, ',')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[。；;]/g, '')
    .trim()
    .toLowerCase();
}
