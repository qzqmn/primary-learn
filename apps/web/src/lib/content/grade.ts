import type { ServerQuestion } from './types';

const fullToHalf = (s: string) =>
  s
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ');

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** 解析 "3/4"、"7"、"1 3/4"、"0.5" 為 [分子, 分母] */
export function parseFraction(raw: string): [number, number] | null {
  const s = fullToHalf(raw).trim().replace(/\s+/g, ' ').replace(/[，,]/g, '');
  let m = s.match(/^(-?\d+) (\d+)\/(\d+)$/);
  if (m) {
    const w = +m[1], n = +m[2], d = +m[3];
    if (d === 0) return null;
    return [w < 0 ? w * d - n : w * d + n, d];
  }
  m = s.match(/^(-?\d+)\/(\d+)$/);
  if (m) return +m[2] === 0 ? null : [+m[1], +m[2]];
  if (/^-?\d+$/.test(s)) return [+s, 1];
  if (/^-?\d*\.\d+$/.test(s)) {
    const places = s.split('.')[1].length;
    if (places > 6) return null;
    return [Math.round(+s * 10 ** places), 10 ** places];
  }
  return null;
}

export function parseNumber(raw: string): number | null {
  const s = fullToHalf(raw).replace(/[,\s$%元]/g, '');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const normText = (s: string) =>
  fullToHalf(s.normalize('NFKC')).toLowerCase().replace(/[\s'’`.,，。!?！？]/g, '');

export function isCorrect(q: Pick<ServerQuestion, 'type' | 'answer' | 'accept' | 'strict'>, given: string): boolean {
  const g = (given ?? '').toString();
  if (!g.trim()) return false;
  switch (q.type) {
    case 'choice':
      return g === q.answer;
    case 'number': {
      const a = parseNumber(q.answer), b = parseNumber(g);
      return a !== null && b !== null && Math.abs(a - b) < 1e-6;
    }
    case 'fraction': {
      const a = parseFraction(q.answer), b = parseFraction(g);
      if (!a || !b) return false;
      if (a[0] * b[1] !== b[0] * a[1]) return false;
      if (q.strict && b[0] !== 0 && gcd(b[0], b[1]) !== 1) return false;
      return true;
    }
    case 'text': {
      const n = normText(g);
      return [q.answer, ...(q.accept ?? [])].some((x) => normText(x) === n);
    }
  }
}
