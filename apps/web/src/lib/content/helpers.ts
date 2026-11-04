import type { Rng } from './rng';
import type { GenQuestion } from './types';

export const NAMES = ['小明', '小芬', '阿欣', '志強', '嘉敏', '家豪', '美玲', '子謙'];

/** 把放大 10^places 倍的整數格式化回小數，避免浮點誤差 */
export function dec(scaled: number, places: number): string {
  const neg = scaled < 0;
  const s = String(Math.abs(Math.round(scaled))).padStart(places + 1, '0');
  const int = s.slice(0, s.length - places);
  const fr = (places ? s.slice(-places) : '').replace(/0+$/, '');
  return (neg ? '-' : '') + int + (fr ? '.' + fr : '');
}
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const frac = (n: number, d: number) => `${n}/${d}`;
export function reduce(n: number, d: number): [number, number] {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}

export function num(prompt: string, answer: number | string, tag: string, explain?: string, suffix?: string): GenQuestion {
  return { type: 'number', prompt, answer: String(answer), tag, explain, suffix };
}
export function fractionQ(prompt: string, answer: string, tag: string, explain?: string, strict = true): GenQuestion {
  return { type: 'fraction', prompt, answer, tag, explain, strict };
}
export function textQ(prompt: string, answer: string, tag: string, explain?: string, accept?: string[]): GenQuestion {
  return { type: 'text', prompt, answer, tag, explain, accept };
}
/** 單選題；干擾項與答案重複時自動剔除 */
export function choice(r: Rng, prompt: string, answer: string, distractors: string[], tag: string, explain?: string): GenQuestion {
  const uniq = Array.from(new Set(distractors.filter((d) => d !== answer)));
  return { type: 'choice', prompt, choices: r.shuffle([answer, ...uniq.slice(0, 3)]), answer, tag, explain };
}

/** 靜態單選題（內容包風格）：choices 的第一個必須是答案之外的干擾項也可，這裡統一 [答案, ...干擾項] */
export function staticChoice(prompt: string, answer: string, wrong: string[], tag: string, explain?: string): GenQuestion {
  return { type: 'choice', prompt, choices: [answer, ...wrong], answer, tag, explain };
}
export const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
