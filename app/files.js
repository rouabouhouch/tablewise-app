import { LIMITS } from '../limits.js?v=6ee401bc68a87739';
import { parseCSV } from '../data/csv.js?v=6ee401bc68a87739';

export async function readDataset(file) {
  if (file.size > LIMITS.bytes) throw new Error('Choose a CSV under 10 MB.');
  return { ...parseCSV(await file.text()), name: file.name, demo: false };
}

export function download(content, filename, mimeType) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
