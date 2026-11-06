import { LIMITS } from '../limits.js?v=1919cefb67302b76';
import { parseNumber } from './values.js?v=1919cefb67302b76';

function detectDelimiter(text) {
  const counts = new Map([[',', 0], [';', 0], ['\t', 0]]);
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (character === '\n' || character === '\r') break;
      if (counts.has(character)) counts.set(character, counts.get(character) + 1);
    }
  }
  return [...counts].sort((left, right) => right[1] - left[1])[0][0];
}

// A quoted field can contain a line break. Only an unquoted separator or
// record terminator ends it, so splitting the file into lines loses data.
function readRecords(text, delimiter) {
  const records = [];
  let row = [];
  let field = '';
  let quoted = false;
  let closed = false;

  function endField() {
    row.push(field.trim());
    field = '';
    closed = false;
  }
  function endRecord() {
    endField();
    if (row.some(value => value !== '')) records.push(row);
    row = [];
    if (records.length > LIMITS.rows + 1) {
      throw new Error('This version supports up to 20,000 rows. Please upload a smaller file.');
    }
  }

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character !== '"') {
        field += character;
      } else if (text[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = false;
        closed = true;
      }
      continue;
    }

    if (character === delimiter) {
      endField();
    } else if (character === '\n' || character === '\r') {
      endRecord();
      if (character === '\r' && text[index + 1] === '\n') index++;
    } else if (character === '"' && !field.trim() && !closed) {
      field = '';
      quoted = true;
    } else if (closed) {
      if (!/\s/.test(character)) {
        throw new Error('Malformed CSV: unexpected text after a quoted field.');
      }
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('Malformed CSV: a quoted field is not closed.');
  if (field || row.length || closed) endRecord();
  return records;
}

function uniqueHeaders(original) {
  const used = new Set();
  return original.map((value, index) => {
    const base = value || `Column ${index + 1}`;
    let header = base;
    for (let suffix = 2; used.has(header); suffix++) {
      header = `${base} (${suffix})`;
    }
    used.add(header);
    return header;
  });
}

/** Parse a CSV/TSV into string rows. Profiling and type inference happen later. */
export function parseCSV(text, forcedDelimiter = 'auto') {
  text = text.replace(/^\uFEFF/, '');
  if (text.length > LIMITS.bytes) throw new Error('This file is too large. Choose a CSV under 10 MB.');
  if (!text.trim()) throw new Error('This file is empty. Add a header row and at least one data row.');

  const delimiter = forcedDelimiter === 'auto' ? detectDelimiter(text) : forcedDelimiter;
  const [original, ...records] = readRecords(text, delimiter);
  if (!records.length) throw new Error('Add at least one data row below the column headers.');
  if (original.length > LIMITS.columns) throw new Error('Please use a file with 80 columns or fewer.');

  const headers = uniqueHeaders(original);
  const warnings = [];
  let padded = 0;
  const rows = records.map((row, index) => {
    if (row.length > headers.length) {
      throw new Error(`Data record ${index + 1} has ${row.length} fields, but the header has ${headers.length}. Check the separator or quotes.`);
    }
    if (row.length === headers.length) return row;
    padded++;
    return row.concat(Array(headers.length - row.length).fill(''));
  });
  if (headers.some((header, index) => header !== original[index])) {
    warnings.push('Blank or repeated headers were renamed.');
  }
  if (padded) warnings.push(`${padded} short records were padded with empty cells.`);
  return { headers, rows, delimiter, warnings };
}

function encodeCell(value) {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text) && parseNumber(text) === null) text = "'" + text;
  return /[",\n\r]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

export function csvText(headers, rows) {
  return [headers, ...rows].map(row => row.map(encodeCell).join(',')).join('\r\n');
}
