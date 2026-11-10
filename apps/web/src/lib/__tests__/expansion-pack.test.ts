import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { loadCatalog, unitsFor } from '../content/registry';
import { generateQuestions } from '../content/engine';
import { isCorrect } from '../content/grade';

process.env.CONTENT_DIR = path.resolve(__dirname, '../../../../../content');

const SUBJECTS = ['math', 'english', 'chinese', 'general'] as const;
const GRADES = [1, 2, 3, 4, 5, 6] as const;
const CODE: Record<(typeof SUBJECTS)[number], string> = {
  math: 'm',
  english: 'e',
  chinese: 'c',
  general: 'g',
};
const PACK = 'hk-original-expansion-2026';

// 用專案自己的載入器，而不是直接讀 JSON：這樣測到的才是學生端／後台矩陣真正看到的 catalog。
const { units, errors } = loadCatalog(true);
const added = units.filter((u) => u.source === PACK);
const cells = SUBJECTS.flatMap((s) => GRADES.map((g) => ({ label: `${s} P${g}`, s, g })));

describe('原創擴充題庫：年級／學科分配', () => {
  it('內容包載入無錯誤，24 個單元全部進入 catalog、沒有 id 撞車', () => {
    expect(errors).toEqual([]);
    expect(added).toHaveLength(24);
    expect(added.every((u) => u.license === 'CC BY-SA 4.0')).toBe(true);
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
  });

  it.each(cells)('$label 恰好一個擴充單元，且只出現在該格', ({ s, g }) => {
    const hits = added.filter((u) => u.subject === s && u.grade === g);
    expect(hits, `${s} P${g} 數量`).toHaveLength(1);
    const u = hits[0];

    // id 編碼（exp-m-p1-… 等）必須與所屬科別年級一致，避免日後改欄位時對不上
    expect(u.id, u.id).toMatch(new RegExp(`^exp-${CODE[s]}-p${g}-[a-z0-9-]+$`));
    expect(u.bank, u.id).toHaveLength(40);
    expect(u.bank!.every((q) => q.tag.includes(`p${g}`)), `${u.id} tag 年級`).toBe(true);
    expect(u.lesson?.points.length, u.id).toBeGreaterThanOrEqual(2);
    expect(u.lesson?.pitfalls?.length, u.id).toBeGreaterThanOrEqual(1);

    // 正向：項目實際用來選題的函式取得到；反向：不會誤入其他 23 格
    expect(unitsFor(s, g).some((x) => x.id === u.id), `${u.id} 不在 ${s} P${g}`).toBe(true);
    for (const cell of cells) {
      if (cell.s === s && cell.g === g) continue;
      expect(
        unitsFor(cell.s, cell.g).some((x) => x.id === u.id),
        `${u.id} 誤入 ${cell.s} P${cell.g}`,
      ).toBe(false);
    }
  });

  it.each(added.map((u) => ({ label: u.id, u })))('$label 可出卷且標準答案會被批改為正確', ({ u }) => {
    const qs = generateQuestions(u, 10, 20261107);
    expect(qs, u.id).toHaveLength(10);
    expect(new Set(qs.map((q) => q.prompt)).size, u.id).toBe(10);
    for (const q of qs) {
      expect(q.unit, u.id).toBe(u.id);
      expect(isCorrect(q, q.answer), `${u.id}: ${q.prompt} → ${q.answer}`).toBe(true);
      if (q.type === 'choice') expect(q.choices, `${u.id}: ${q.prompt}`).toContain(q.answer);
    }
  });

  it('合計 960 題（v2 每單元 40 題），且背景題目沒有重複題面', () => {
    const prompts = added.flatMap((u) => u.bank!.map((q) => q.prompt));
    expect(prompts).toHaveLength(960);
    expect(new Set(prompts).size).toBe(960);
  });
});
