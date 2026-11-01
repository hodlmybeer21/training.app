// Debrief strengths and opportunities should coach, not read the trainee's own lines
// back to them. The scoring prompt asks for paraphrase; this is the safety net when a
// model pastes a whole line anyway.

const MAX_QUOTE_WORDS = 12; // a quote longer than this gets shortened
const KEEP_QUOTE_WORDS = 8; // words kept from a shortened quote
const MIN_OWN_WORDS = 6; // words of the coach's own commentary an item must have

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Longest run of consecutive words shared by item and line (compared without case or punctuation). */
function longestRun(item: string[], line: string[]): { start: number; len: number } {
  let best = { start: 0, len: 0 };
  let prev = new Array(line.length + 1).fill(0);
  for (let i = 1; i <= item.length; i++) {
    const cur = new Array(line.length + 1).fill(0);
    for (let j = 1; j <= line.length; j++) {
      if (item[i - 1] && item[i - 1] === line[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best.len) best = { start: i - cur[j], len: cur[j] };
      }
    }
    prev = cur;
  }
  return best;
}

/**
 * Shortens long verbatim quotes of the trainee's lines inside a strength or
 * opportunity, and returns null when what's left is mostly the trainee's own words
 * with too little coaching around it.
 */
export function trimTraineeQuotes(item: string, traineeLines: string[]): string | null {
  let words = item.split(/\s+/).filter(Boolean);
  const lines = traineeLines.map(l => l.split(/\s+/).filter(Boolean).map(norm).filter(Boolean)).filter(l => l.length);
  if (!lines.length) return item;
  let quoted = 0;
  for (let pass = 0; pass < 4; pass++) {
    const normItem = words.map(norm);
    let best = { start: 0, len: 0 };
    for (const l of lines) {
      const r = longestRun(normItem, l);
      if (r.len > best.len) best = r;
    }
    if (best.len < MIN_OWN_WORDS) break;
    if (best.len <= MAX_QUOTE_WORDS) { quoted += best.len; break; }
    const run = words.slice(best.start, best.start + best.len);
    const close = (run[run.length - 1].match(/["'”’)]+$/) || [''])[0];
    const kept = run.slice(0, KEEP_QUOTE_WORDS);
    kept[kept.length - 1] = kept[kept.length - 1].replace(/[.,;:!?]+$/, '') + '…' + close;
    words = [...words.slice(0, best.start), ...kept, ...words.slice(best.start + best.len)];
    quoted += KEEP_QUOTE_WORDS;
  }
  const own = words.length - quoted;
  return own < MIN_OWN_WORDS ? null : words.join(' ');
}
