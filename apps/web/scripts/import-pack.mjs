#!/usr/bin/env node
// 把 CSV（例如你整理過的、授權清楚的題庫）轉成內容包 JSON。轉換後請人工逐題審核，再到後台「題庫與內容包」上傳。
//
//   node scripts/import-pack.mjs questions.csv \
//     --pack my-english-g3 --unit-id e3-my-unit --subject english --grade 3 --title "我的單元" \
//     --license CC0-1.0 --source "https://example.org/dataset" --tag e-my-tag > pack.json
//
// CSV 欄位（第一列為標題列）：prompt, answer, wrong1, wrong2, wrong3, explain, tag
//   - 有 wrong1…wrong3 → 單選題；沒有 → 文字題（answer 為標準答案）。tag 欄可省略（用 --tag）。
//   - 支援雙引號包住含逗號或換行的欄位。
import fs from 'node:fs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const need = (k) => { const v = opt(k); if (!v) { console.error(`缺少 --${k}`); process.exit(2); } return v; };
if (!file) { console.error('用法：node scripts/import-pack.mjs questions.csv --pack … --unit-id … --subject math|english|chinese|general --grade 1-6 --title … --license … [--source URL] [--tag t]'); process.exit(2); }

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const head = rows.shift().map((h) => h.trim().toLowerCase());
const col = (r, name) => (r[head.indexOf(name)] ?? '').trim();
const defaultTag = opt('tag', 'imported');
const questions = [], problems = [];
rows.forEach((r, i) => {
  const prompt = col(r, 'prompt'), answer = col(r, 'answer');
  if (!prompt || !answer) return problems.push(`第 ${i + 2} 行：缺少 prompt 或 answer`);
  const wrong = ['wrong1', 'wrong2', 'wrong3'].map((k) => col(r, k)).filter(Boolean);
  const tag = col(r, 'tag') || defaultTag, explain = col(r, 'explain');
  if (wrong.length) {
    const choices = [answer, ...wrong];
    if (new Set(choices).size !== choices.length) return problems.push(`第 ${i + 2} 行：選項有重複`);
    questions.push({ type: 'choice', prompt, choices, answer, ...(explain && { explain }), tag });
  } else questions.push({ type: 'text', prompt, answer, ...(explain && { explain }), tag });
});
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const pack = {
  pack: need('pack'), version: 1, license: need('license'), ...(opt('source') && { source: opt('source') }),
  units: [{ id: need('unit-id'), subject: need('subject'), grade: Number(need('grade')), title: need('title'), intro: [], questions }],
};
process.stdout.write(JSON.stringify(pack, null, 1) + '\n');
console.error(`已轉換 ${questions.length} 題。請人工審核答案與年級，再上傳。`);
