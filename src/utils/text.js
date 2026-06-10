export function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function splitIngredientInput(value) {
  return String(value || '')
    .split(/[,，、;；\n\r]+/)
    .map((item) => stripBracketNotes(item).trim())
    .filter(Boolean);
}

function stripBracketNotes(value) {
  let result = String(value || '');
  let previous;
  do {
    previous = result;
    result = result.replace(/\s*[\(（][^()（）]*[\)）]\s*/g, '');
  } while (result !== previous);
  return result;
}

export function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
