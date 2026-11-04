import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { allUnits, loadCatalog, packToUnits } from '../content/registry';
import { generateQuestions, toClient, fingerprint } from '../content/engine';
import { isCorrect, parseFraction } from '../content/grade';

process.env.CONTENT_DIR = path.resolve(__dirname, '../../../../../content');

describe('catalog', () => {
  it('loads built-in math and official packs without errors', () => {
    const { units, errors } = loadCatalog(true);
    expect(errors).toEqual([]);
    const subjects = new Set(units.map((u) => u.subject));
    expect(subjects).toEqual(new Set(['math', 'english', 'chinese', 'general']));
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
    for (let g = 1; g <= 6; g++) expect(units.filter((u) => u.subject === 'math' && u.grade === g).length).toBeGreaterThanOrEqual(4);
  });
  it('rejects malformed packs', () => {
    expect(() => packToUnits({ pack: 'x', version: 1, units: [{ id: 'a', subject: 'english', grade: 1, title: 't', questions: [{ type: 'choice', prompt: 'p', choices: ['a', 'b'], answer: 'zzz', tag: 't' }] }] })).toThrow();
    expect(() => packToUnits({ pack: 'x', version: 1, units: [{ id: 'Bad Id', subject: 'math', grade: 1, title: 't', questions: [] }] })).toThrow();
  });
  it('every static question has its answer among the choices and unique choices', () => {
    for (const u of allUnits().filter((x) => x.bank)) {
      for (const q of u.bank!) {
        if (q.type === 'choice') {
          expect(q.choices).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices!.length);
        }
      }
    }
  });
});

describe('generators (every unit, many seeds)', () => {
  const units = allUnits().filter((u) => u.gens);
  it.each(units.map((u) => [u.id, u] as const))('%s produces valid, self-consistent questions', (_id, u) => {
    for (let seed = 1; seed <= 60; seed++) {
      const qs = generateQuestions(u, 12, seed * 7919);
      expect(qs.length).toBeGreaterThanOrEqual(8);
      expect(new Set(qs.map((q) => q.prompt)).size).toBe(qs.length);
      for (const q of qs) {
        expect(q.prompt).not.toMatch(/NaN|undefined|Infinity|\[object/);
        expect(q.explain ?? '').not.toMatch(/NaN|undefined|Infinity/);
        expect(q.tag).toBeTruthy();
        expect(isCorrect(q, q.answer)).toBe(true); // the stored answer must grade as correct
        if (q.type === 'number') expect(Number(q.answer.replace(/,/g, ''))).toBeGreaterThanOrEqual(0);
        if (q.type === 'choice') {
          expect(q.choices).toContain(q.answer);
          expect(new Set(q.choices).size).toBe(q.choices!.length);
          expect(q.choices!.length).toBeGreaterThanOrEqual(2);
        }
        if (q.type === 'fraction') {
          const f = parseFraction(q.answer)!;
          expect(f).not.toBeNull();
          expect(f[1]).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('arithmetic correctness (independent re-computation)', () => {
  const ops: Record<string, (a: number, b: number) => number> = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };
  it('plain "a op b = ?" prompts match an independent calculation', () => {
    let checked = 0;
    for (const u of allUnits().filter((x) => x.gens)) {
      for (let seed = 1; seed <= 40; seed++) {
        for (const q of generateQuestions(u, 10, seed * 31)) {
          const m = q.prompt.match(/^(\d+(?:\.\d+)?) ([+−×÷]) (\d+(?:\.\d+)?) = \?$/);
          if (!m || q.type !== 'number') continue;
          const expected = ops[m[2]](Number(m[1]), Number(m[3]));
          expect(Number(q.answer)).toBeCloseTo(expected, 6);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });
  it('remainder questions are consistent', () => {
    const u = allUnits().find((x) => x.id === 'm3-muldiv')!;
    for (let seed = 1; seed <= 80; seed++) {
      for (const q of generateQuestions(u, 10, seed)) {
        const m = q.prompt.match(/^(\d+) ÷ (\d+)，(商|餘數)/);
        if (!m) continue;
        const [a, b] = [Number(m[1]), Number(m[2])];
        expect(Number(q.answer)).toBe(m[3] === '商' ? Math.floor(a / b) : a % b);
      }
    }
  });
  it('circle questions use pi = 3.14 exactly', () => {
    const u = allUnits().find((x) => x.id === 'm6-circle')!;
    for (let seed = 1; seed <= 60; seed++) {
      for (const q of generateQuestions(u, 6, seed)) {
        const r = q.prompt.match(/半徑是 (\d+)/);
        const d = q.prompt.match(/直徑是 (\d+)/);
        if (r && q.prompt.includes('圓周')) expect(Number(q.answer)).toBeCloseTo(2 * 3.14 * Number(r[1]), 6);
        if (r && q.prompt.includes('圓面積')) expect(Number(q.answer)).toBeCloseTo(3.14 * Number(r[1]) ** 2, 6);
        if (d) expect(Number(q.answer)).toBeCloseTo(3.14 * Number(d[1]), 6);
      }
    }
  });
  it('equations: substituting the answer satisfies the equation', () => {
    const u = allUnits().find((x) => x.id === 'm6-algebra')!;
    for (let seed = 1; seed <= 80; seed++) {
      for (const q of generateQuestions(u, 6, seed)) {
        const x = Number(q.answer);
        let m = q.prompt.match(/(\d+)x \+ (\d+) = (\d+)/);
        if (m) expect(Number(m[1]) * x + Number(m[2])).toBe(Number(m[3]));
        m = q.prompt.match(/(\d+)x − (\d+) = (\d+)/);
        if (m) expect(Number(m[1]) * x - Number(m[2])).toBe(Number(m[3]));
        m = q.prompt.match(/(\d+)\(x \+ (\d+)\) = (\d+)/);
        if (m) expect(Number(m[1]) * (x + Number(m[2]))).toBe(Number(m[3]));
      }
    }
  });
});

describe('engine', () => {
  const unit = allUnits().find((u) => u.id === 'm4-mixed')!;
  it('is reproducible from its seed and varies between seeds', () => {
    expect(generateQuestions(unit, 10, 42)).toEqual(generateQuestions(unit, 10, 42));
    expect(generateQuestions(unit, 10, 42)).not.toEqual(generateQuestions(unit, 10, 43));
  });
  it('never leaks answers or explanations to the client', () => {
    for (const q of generateQuestions(unit, 10, 5)) {
      const c = toClient(q) as Record<string, unknown>;
      expect(c.answer).toBeUndefined();
      expect(c.explain).toBeUndefined();
      expect(c.accept).toBeUndefined();
    }
  });
  it('static banks are shuffled and capped to the available size', () => {
    const en = allUnits().find((u) => u.id === 'e2-be-verbs')!;
    const qs = generateQuestions(en, 50, 9);
    expect(qs.length).toBe(en.bank!.length);
    expect(new Set(qs.map((q) => q.prompt)).size).toBe(qs.length);
  });
  it('fingerprints are stable and differ between questions', () => {
    const [a, b] = generateQuestions(unit, 2, 1);
    expect(fingerprint(a)).toBe(fingerprint(a));
    expect(fingerprint(a)).not.toBe(fingerprint(b));
  });
});

describe('grading', () => {
  it('numbers: tolerant to spaces, commas, full-width digits and units', () => {
    const q = { type: 'number' as const, answer: '1234.5' };
    expect(isCorrect(q, '1,234.5')).toBe(true);
    expect(isCorrect(q, ' １２３４．５ ')).toBe(true); // full-width input (Chinese IME) is normalised
    expect(isCorrect({ type: 'number', answer: '15' }, '１５')).toBe(true);
    expect(isCorrect({ type: 'number', answer: '35' }, '35%')).toBe(true);
    expect(isCorrect({ type: 'number', answer: '35' }, '36')).toBe(false);
    expect(isCorrect({ type: 'number', answer: '35' }, '')).toBe(false);
    expect(isCorrect({ type: 'number', answer: '35' }, 'abc')).toBe(false);
  });
  it('fractions: equivalence, mixed numbers and strictness', () => {
    expect(isCorrect({ type: 'fraction', answer: '1/2', strict: true }, '1/2')).toBe(true);
    expect(isCorrect({ type: 'fraction', answer: '1/2', strict: true }, '2/4')).toBe(false);
    expect(isCorrect({ type: 'fraction', answer: '1/2', strict: false }, '2/4')).toBe(true);
    expect(isCorrect({ type: 'fraction', answer: '7/4', strict: false }, '1 3/4')).toBe(true);
    expect(isCorrect({ type: 'fraction', answer: '1 3/4', strict: false }, '7/4')).toBe(true);
    expect(isCorrect({ type: 'fraction', answer: '3/2', strict: false }, '1.5')).toBe(true);
    expect(isCorrect({ type: 'fraction', answer: '1/2', strict: true }, '1/0')).toBe(false);
  });
  it('text and choice', () => {
    expect(isCorrect({ type: 'text', answer: '2:3', accept: ['2：3'] }, '2：3')).toBe(true);
    expect(isCorrect({ type: 'text', answer: '2:3' }, ' 2 : 3 ')).toBe(true);
    expect(isCorrect({ type: 'text', answer: '2:3' }, '3:2')).toBe(false);
    expect(isCorrect({ type: 'choice', answer: 'boxes' }, 'boxes')).toBe(true);
    expect(isCorrect({ type: 'choice', answer: 'boxes' }, 'Boxes')).toBe(false);
  });
});

describe('教學內容', () => {
  it('每個內建單元都有教學內容（講解或重點），且講解沒有空白', () => {
    for (const u of allUnits().filter((x) => x.source === 'builtin')) {
      const points = u.lesson?.points ?? u.intro;
      expect(points.length, u.id).toBeGreaterThan(0);
      for (const p of points) expect(p.trim().length, u.id).toBeGreaterThan(5);
    }
  });
  it('教學內容只對應存在的單元（沒有寫錯單元 ID）', async () => {
    const { LESSONS } = await import('../content/lessons');
    const ids = new Set(allUnits().map((u) => u.id));
    for (const id of Object.keys(LESSONS)) expect(ids.has(id), id).toBe(true);
  });
  it('所有數學單元都有完整的教學重點與常見錯誤', async () => {
    const { LESSONS } = await import('../content/lessons');
    for (const u of allUnits().filter((x) => x.subject === 'math')) {
      expect(LESSONS[u.id]?.points.length, u.id).toBeGreaterThanOrEqual(2);
      expect(LESSONS[u.id]?.pitfalls?.length, u.id).toBeGreaterThanOrEqual(1);
    }
  });
});
