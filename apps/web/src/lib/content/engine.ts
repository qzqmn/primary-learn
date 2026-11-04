import { makeRng, type Rng } from './rng';
import type { ClientQuestion, GenQuestion, ServerQuestion, Unit } from './types';

const MAX_RETRY = 25;

/** 依單元產生 n 題（不重複題目文字）。靜態題庫按種子洗牌後取前 n 題；選擇題的選項順序每次洗牌。 */
export function generateQuestions(unit: Unit, n: number, seed: number): ServerQuestion[] {
  const r = makeRng(seed);
  const out: ServerQuestion[] = [];
  const seen = new Set<string>();
  const push = (q: GenQuestion) => {
    const full: ServerQuestion = { ...q, unit: unit.id };
    if (full.type === 'choice' && full.choices) full.choices = r.shuffle(full.choices);
    out.push(full);
    seen.add(q.prompt);
  };
  if (unit.bank?.length) {
    for (const q of r.shuffle(unit.bank).slice(0, n)) push(q);
  }
  if (unit.gens?.length) {
    let guard = 0;
    while (out.length < n && guard++ < n * MAX_RETRY) {
      const q = unit.gens[r.int(0, unit.gens.length - 1)](r);
      if (seen.has(q.prompt)) continue;
      push(q);
    }
  }
  return out;
}

export function toClient(q: ServerQuestion): ClientQuestion {
  return { type: q.type, prompt: q.prompt, choices: q.choices, tag: q.tag, suffix: q.suffix };
}

/** 錯題指紋：同一題（題目文字＋答案）只會有一個錯題記錄 */
export function fingerprint(q: Pick<ServerQuestion, 'prompt' | 'answer'>): string {
  let h = 5381;
  const s = q.prompt + '\u0000' + q.answer;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + s.length;
}
export type { Rng };
