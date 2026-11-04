import { describe, expect, it } from 'vitest';
import path from 'node:path';
import * as D from '../content/english-data';
import { allUnits, loadCatalog } from '../content/registry';
import { generateQuestions } from '../content/engine';

process.env.CONTENT_DIR = path.resolve(__dirname, '../../../../../content');
loadCatalog(true);

const V = /[aeiou]/;
const third = (b: string) => (b === 'have' ? 'has' : /(s|x|z|ch|sh|o)$/.test(b) ? b + 'es' : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + 'ies' : b + 's');
const pastRegular = (b: string) => (b.endsWith('e') ? b + 'd' : /[^aeiou]y$/.test(b) ? b.slice(0, -1) + 'ied' : b + 'ed');
const DOUBLE = new Set(['run', 'sit', 'swim', 'get', 'win', 'forget', 'stop', 'plan']);
const ingRule = (b: string) => (DOUBLE.has(b) ? b + b.slice(-1) + 'ing' : b.endsWith('e') && !b.endsWith('ee') ? b.slice(0, -1) + 'ing' : b + 'ing');

describe('詞表資料完整性', () => {
  const lists: Record<string, D.W[]> = { ANIMALS: D.ANIMALS, COLOURS: D.COLOURS, FOOD: D.FOOD, BODY: D.BODY, FAMILY: D.FAMILY, SCHOOL: D.SCHOOL, CLOTHES: D.CLOTHES, HOME: D.HOME, PLACES: D.PLACES, JOBS: D.JOBS, TRANSPORT: D.TRANSPORT, WEATHER: D.WEATHER, HOBBIES: D.HOBBIES, ADVANCED1: D.ADVANCED1, ADVANCED2: D.ADVANCED2 };
  it('每個詞表內英文與中文釋義都不重複（避免干擾項剛好也是答案）', () => {
    for (const [name, l] of Object.entries(lists)) {
      expect(new Set(l.map((w) => w[0])).size, `${name} en`).toBe(l.length);
      expect(new Set(l.map((w) => w[1])).size, `${name} zh`).toBe(l.length);
    }
  });
  it('所有詞表合併後，英文字也不重複', () => {
    const all = Object.values(lists).flat().map((w) => w[0].toLowerCase());
    expect(all.filter((w, i) => all.indexOf(w) !== i)).toEqual([]);
  });
  it('所有詞表合併後，中文釋義也不重複', () => {
    const all = Object.values(lists).flat().map((w) => w[1]);
    expect(all.filter((w, i) => all.indexOf(w) !== i)).toEqual([]);
  });
});

describe('動詞表與語法規則一致', () => {
  it('第三身單數 -s 形式符合規則', () => {
    for (const v of D.VERBS) expect(v.s, v.base).toBe(third(v.base));
  });
  it('規則動詞的過去式符合規則', () => {
    for (const v of D.VERBS.filter((x) => !x.irregular)) expect(v.past, v.base).toBe(pastRegular(v.base));
  });
  it('-ing 形式符合規則（含雙寫字母、去 e）', () => {
    for (const v of D.VERBS) expect(v.ing, v.base).toBe(ingRule(v.base));
  });
  it('不規則動詞的過去式不是 -ed 規則形式，且彼此不重複', () => {
    const irr = D.VERBS.filter((x) => x.irregular);
    for (const v of irr) expect(v.past, v.base).not.toBe(pastRegular(v.base));
    expect(new Set(irr.map((v) => v.past)).size).toBe(irr.length);
  });
});

describe('名詞眾數、形容詞、a/an、反義詞', () => {
  it('規則眾數符合規則', () => {
    for (const p of D.PLURALS.filter((x) => /一般|以 x|以 s|以 sh|以 ch|輔音字母 \+ y|元音字母 \+ y/.test(x.rule))) {
      const expected = /[^aeiou]y$/.test(p.s) ? p.s.slice(0, -1) + 'ies' : /(s|x|sh|ch)$/.test(p.s) ? p.s + 'es' : p.s + 's';
      expect(p.p, p.s).toBe(expected);
    }
  });
  it('比較級與最高級格式一致', () => {
    for (const a of D.ADJ) {
      if (a.comp.startsWith('more ')) {
        expect(a.comp).toBe('more ' + a.base);
        expect(a.sup).toBe('most ' + a.base);
      } else if (!['good', 'bad'].includes(a.base)) {
        expect(a.comp.endsWith('er'), a.base).toBe(true);
        expect(a.sup.endsWith('est'), a.base).toBe(true);
        expect(a.comp.slice(0, 2)).toBe(a.base.slice(0, 2));
      }
    }
    const g = D.ADJ.find((a) => a.base === 'good')!, b = D.ADJ.find((a) => a.base === 'bad')!;
    expect([g.comp, g.sup, b.comp, b.sup]).toEqual(['better', 'best', 'worse', 'worst']);
  });
  it('a/an 符合發音規則（含例外）', () => {
    for (const x of D.A_AN) {
      const exceptions: Record<string, 'a' | 'an'> = { hour: 'an', university: 'a', uniform: 'a', 'honest boy': 'an' };
      expect(x.art, x.w).toBe(exceptions[x.w] ?? (/^[aeiou]/.test(x.w) ? 'an' : 'a'));
    }
  });
  it('反義詞表沒有任何一個字出現兩次（否則「相反詞」可能有兩個答案）', () => {
    const all = D.OPPOSITES.flat();
    expect(all.filter((w, i) => all.indexOf(w) !== i)).toEqual([]);
  });
});

describe('生成題目與獨立算法一致', () => {
  const unit = (id: string) => allUnits().find((u) => u.id === id)!;
  const many = (id: string, n = 60) => Array.from({ length: n }, (_, s) => generateQuestions(unit(id), 12, s * 97 + 3)).flat();

  it('數字拼寫', () => {
    const W = (n: number): string => (n <= 20 ? D.NUM_WORDS[n] : n % 10 === 0 ? D.TENS[n] : `${D.TENS[n - (n % 10)]}-${D.NUM_WORDS[n % 10]}`);
    let checked = 0;
    for (const q of many('e2-numbers')) {
      const m = q.prompt.match(/^數字 (\d+) 的英文怎樣寫/);
      if (m) { expect(q.answer).toBe(W(Number(m[1]))); checked++; }
    }
    expect(checked).toBeGreaterThan(20);
    expect(W(21)).toBe('twenty-one');
    expect(W(40)).toBe('forty');
  });
  it('時間說法', () => {
    const exp = (h: number, m: number) => {
      const H = (x: number) => D.NUM_WORDS[((x - 1) % 12) + 1];
      const mw: Record<number, string> = { 5: 'five', 10: 'ten', 20: 'twenty', 25: 'twenty-five' };
      return m === 0 ? `${H(h)} o'clock` : m === 15 ? `a quarter past ${H(h)}` : m === 30 ? `half past ${H(h)}` : m === 45 ? `a quarter to ${H(h + 1)}` : m < 30 ? `${mw[m]} past ${H(h)}` : `${mw[60 - m]} to ${H(h + 1)}`;
    };
    let n = 0;
    for (const q of many('e3-time')) {
      const m = q.prompt.match(/^(\d+):(\d\d) 用英文/);
      if (m) { expect(q.answer).toBe(exp(Number(m[1]), Number(m[2]))); n++; }
    }
    expect(n).toBeGreaterThan(20);
    expect(exp(3, 45)).toBe('a quarter to four');
    expect(exp(12, 45)).toBe('a quarter to one');
    expect(exp(5, 35)).toBe('twenty-five to six');
  });
  it('時態題：答案與提示詞的時態一致（對照動詞表）', () => {
    const pasts = new Set(D.VERBS.map((v) => v.past));
    const presents = new Set(D.VERBS.flatMap((v) => [v.base, v.s]));
    const ings = new Set(D.VERBS.map((v) => v.ing));
    let n = { look: 0, past: 0, future: 0, habit: 0 };
    for (const q of many('e6-tenses')) {
      if (q.prompt.startsWith('Look!')) { const m = q.answer.match(/^(am|is|are) (\w+)$/); expect(m && ings.has(m[2]), q.answer).toBeTruthy(); n.look++; }
      else if (/^(Yesterday|Last week|Two days ago),/.test(q.prompt)) { expect(pasts.has(q.answer), q.answer).toBe(true); n.past++; }
      else if (/^(Tomorrow|Next week|Next Sunday),/.test(q.prompt)) { expect(q.answer).toMatch(/^will \w+$/); expect(D.VERBS.some((v) => 'will ' + v.base === q.answer)).toBe(true); n.future++; }
      else { expect(presents.has(q.answer), q.answer).toBe(true); n.habit++; }
    }
    expect(Math.min(...Object.values(n))).toBeGreaterThan(20);
  });
  it('現在式：第三身單數用 -s，其他用原形', () => {
    const S3 = ['He', 'She', 'Tom', 'My mother', 'The teacher', 'My brother'];
    for (const q of many('e3-present-simple')) {
      const m = q.prompt.match(/^(.+?) ___ .+ (every day|every morning|on Sundays|after school)\. \((\w+)\)$/);
      if (!m) continue;
      const v = D.VERBS.find((x) => x.base === m[3])!;
      expect(q.answer).toBe(S3.includes(m[1]) ? v.s : v.base);
    }
  });
  it('Do/Does 題：he/she/it 用 Does', () => {
    for (const q of many('e3-present-simple')) {
      const m = q.prompt.match(/^___ (he|she|it|you|we|they|I) /);
      if (m) expect(q.answer).toBe(['he', 'she', 'it'].includes(m[1]) ? 'Does' : 'Do');
    }
  });
  it('反義詞題的答案確實是表中的配對', () => {
    const pairs = new Map<string, string>();
    for (const [a, b] of D.OPPOSITES) { pairs.set(a, b); pairs.set(b, a); }
    for (const q of many('e2-opposites')) {
      const m = q.prompt.match(/^「(.+)」的相反詞/);
      expect(pairs.get(m![1])).toBe(q.answer);
    }
  });
  it('每個英文單元都能產生足夠多、且不重複的題目', () => {
    for (const u of allUnits().filter((x) => x.subject === 'english' && x.source === 'builtin')) {
      const qs = generateQuestions(u, 10, 7);
      expect(qs.length, u.id).toBeGreaterThanOrEqual(8);
      expect(new Set(qs.map((q) => q.prompt)).size, u.id).toBe(qs.length);
    }
  });
});
