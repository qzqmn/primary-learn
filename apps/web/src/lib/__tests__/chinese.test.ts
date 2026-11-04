import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { ANTONYMS, DE, IDIOMS, MEASURE, MEASURE_WORDS, SYNONYMS, ZAI } from '../content/chinese-data';
import { allUnits, loadCatalog } from '../content/registry';
import { generateQuestions } from '../content/engine';

process.env.CONTENT_DIR = path.resolve(__dirname, '../../../../../content');
loadCatalog(true);
const dups = (a: string[]) => a.filter((w, i) => a.indexOf(w) !== i);
const unit = (id: string) => allUnits().find((u) => u.id === id)!;
const many = (id: string, n = 60) => Array.from({ length: n }, (_, s) => generateQuestions(unit(id), 12, s * 131 + 5)).flat();

describe('中文詞表完整性', () => {
  it('反義詞表每個字只出現一次（避免同一個字有兩個「相反詞」答案）', () => expect(dups(ANTONYMS.flat())).toEqual([]));
  it('近義詞表每個詞只出現一次', () => expect(dups(SYNONYMS.flat())).toEqual([]));
  it('反義詞與近義詞兩張表互不重疊（避免干擾項剛好是近義或反義）', () => expect(ANTONYMS.flat().filter((w) => SYNONYMS.flat().includes(w))).toEqual([]));
  it('量詞表：每個名詞只出現一次，正確量詞在量詞庫內，排除項不含正確答案', () => {
    expect(dups(MEASURE.map((m) => m[0]))).toEqual([]);
    for (const [n, m, ex] of MEASURE) {
      expect(MEASURE_WORDS, n).toContain(m);
      expect(ex, n).not.toContain(m);
    }
  });
  it('成語不重複，意思不重複，填充句只有一個空格', () => {
    expect(dups(IDIOMS.map((i) => i.w))).toEqual([]);
    expect(dups(IDIOMS.map((i) => i.meaning))).toEqual([]);
    for (const i of IDIOMS) {
      expect(i.blank.split('＿＿').length, i.w).toBe(2);
      expect(i.blank, i.w).not.toContain(i.w); // 句子本身不能洩漏答案
      expect([4, 5], i.w).toContain(i.w.length); // 鐵杵磨成針是五字俗語
    }
  });
  it('的／地／得、再／在 填充句：每句只有一個空格，答案與說明一致', () => {
    for (const x of [...DE, ...ZAI]) {
      expect(x.s.split('＿＿').length, x.s).toBe(2);
      expect(x.why, x.s).toContain(x.a);
    }
  });
});

describe('中文生成題目', () => {
  it('量詞題：答案是表中的量詞，干擾項不含「也說得通」的量詞', () => {
    const byNoun = new Map(MEASURE.map(([n, m, ex]) => [n, { m, ex }]));
    let n = 0;
    for (const q of many('c1-measure-more')) {
      const m = q.prompt.match(/^一＿＿(.+)$/) ?? q.prompt.match(/^弟弟有三＿＿(.+)。$/);
      const e = byNoun.get(m![1])!;
      expect(q.answer).toBe(e.m);
      for (const c of q.choices!.filter((c) => c !== q.answer)) expect(e.ex).not.toContain(c);
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });
  it('反義詞題：答案是表中的配對，干擾項長度相同', () => {
    const map = new Map<string, string>();
    for (const [a, b] of ANTONYMS) { map.set(a, b); map.set(b, a); }
    for (const q of many('c2-antonyms-more')) {
      const w = q.prompt.match(/^「(.+)」/)![1];
      expect(map.get(w)).toBe(q.answer);
      for (const c of q.choices!) expect(c.length).toBe(q.answer.length);
    }
  });
  it('近義詞題：答案是表中的配對', () => {
    const map = new Map<string, string>();
    for (const [a, b] of SYNONYMS) { map.set(a, b); map.set(b, a); }
    for (const q of many('c3-synonyms-more')) expect(map.get(q.prompt.match(/^「(.+)」/)![1])).toBe(q.answer);
  });
  it('成語題：意思／填充的答案正確，干擾項來自不同性質的成語', () => {
    const byW = new Map(IDIOMS.map((i) => [i.w, i]));
    const byMeaning = new Map(IDIOMS.map((i) => [i.meaning, i]));
    for (const id of ['c4-idioms-feeling', 'c5-idioms-effort', 'c6-idioms-fable']) {
      for (const q of many(id, 40)) {
        if (q.prompt.startsWith('「')) {
          const w = byW.get(q.prompt.match(/^「(.+)」/)![1])!;
          expect(q.answer).toBe(w.meaning);
          for (const c of q.choices!.filter((c) => c !== q.answer)) expect(byMeaning.get(c)!.theme).not.toBe(w.theme);
        } else {
          const w = IDIOMS.find((i) => q.prompt.endsWith(i.blank))!;
          expect(q.answer).toBe(w.w);
          for (const c of q.choices!.filter((c) => c !== q.answer)) expect(byW.get(c)!.theme).not.toBe(w.theme);
        }
      }
    }
  });
  it('的地得／再在：答案與資料一致', () => {
    const key = new Map([...DE, ...ZAI].map((x) => [x.s, x.a]));
    for (const id of ['c3-de', 'c2-zai']) for (const q of many(id, 20)) expect(q.answer).toBe(key.get(q.prompt.replace('選出適當的字：', '')));
  });
});

import { POEMS, PUNCT, SIMILAR } from '../content/chinese-more';

describe('唐詩、標點、形近字', () => {
  it('唐詩填充：把答案填回去，必須與原詩逐字一致', () => {
    for (const p of POEMS) {
      const text = p.lines.join('');
      for (const [q, a, wrong] of p.blanks) {
        expect(q.split('＿＿').length, q).toBe(2);
        const filled = q.replace('＿＿', a);
        expect(text.includes(filled), `${p.title}: ${filled}`).toBe(true);
        for (const w of wrong) expect(text.includes(q.replace('＿＿', w)), `干擾項 ${w} 不應也是原文`).toBe(false);
        expect(wrong).not.toContain(a);
        expect(new Set(wrong).size).toBe(wrong.length);
      }
    }
  });
  it('唐詩：作者與標題不重複、每首詩至少有兩個填充題', () => {
    expect(dups(POEMS.map((p) => p.title))).toEqual([]);
    for (const p of POEMS) expect(p.blanks.length).toBeGreaterThanOrEqual(2);
  });
  it('標點與形近字：每句一個空格，答案在選項內', () => {
    for (const x of PUNCT) { expect(x.s.split('＿').length, x.s).toBe(2); }
    for (const x of SIMILAR) { expect(x.opts, x.s).toContain(x.a); expect(x.s.split('＿＿').length, x.s).toBe(2); expect(new Set(x.opts).size).toBe(x.opts.length); }
  });
  it('詩、分類、搭配題的生成結果自洽', () => {
    for (const id of ['c1-poems-1', 'c3-poems-2', 'c5-poems-3', 'c4-category', 'c3-collocation', 'c1-punct', 'c2-similar']) {
      const qs = many(id, 25);
      expect(qs.length, id).toBeGreaterThan(50);
      for (const q of qs) {
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(q.choices!.length);
        expect(q.choices!.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
  it('唐詩「出自哪一首詩」與「作者」的答案正確', () => {
    for (const q of many('c3-poems-2', 40)) {
      const t = q.prompt.match(/^「(.+)」出自/);
      if (t) expect(POEMS.find((p) => p.lines[0].startsWith(t[1]))!.title).toBe(q.answer);
      const a = q.prompt.match(/^《(.+)》的作者/);
      if (a) expect(POEMS.find((p) => p.title === a[1])!.author).toBe(q.answer);
    }
  });
  it('找不同類：答案確實來自另一個類別', () => {
    const catOf = new Map<string, string>();
    const CAT = { 水果: ['蘋果', '香蕉', '西瓜', '橙', '提子', '草莓'] };
    void CAT; void catOf;
    for (const q of many('c4-category', 30)) {
      const m = q.explain!.match(/^(.+)都是(.+)，「(.+)」是(.+)。$/);
      expect(m && m[2] !== m[4], q.explain).toBeTruthy();
      expect(m![3]).toBe(q.answer);
    }
  });
});
