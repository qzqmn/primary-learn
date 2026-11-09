import { describe, expect, it } from 'vitest';
import { schedule } from '../srs';
import { generateSecret, base32Decode, hotp, totpAt, verifyTotp, otpauthUrl, TOTP_STEP_SEC } from '../totp';
import { assertPaperCompliance, paperSchema, serializeQuestions, OWNER_DECLARATION } from '../papers';
import { BADGE_DEFS } from '../badges';
import { allUnits } from '../content/registry';
import { generateQuestions } from '../content/engine';
import { isCorrect } from '../content/grade';

const DAY = 86_400_000;
const base = { intervalDays: 1, ease: 250, repetitions: 0, lapses: 0 };
const NOW = 1_800_000_000_000;

describe('B1 間隔重複排程', () => {
  it('答對逐步拉長間隔：1 天 → 6 天 → 按 ease 倍增', () => {
    const a = schedule(base, true, NOW);
    expect(a).toMatchObject({ intervalDays: 1, ease: 260, repetitions: 1, lapses: 0 });
    expect(a.dueAt).toBe(NOW + DAY);
    const b = schedule(a, true, NOW);
    expect(b).toMatchObject({ intervalDays: 6, ease: 270, repetitions: 2 });
    const c = schedule(b, true, NOW);
    expect(c.intervalDays).toBe(Math.ceil((6 * 270) / 100));
    expect(c.dueAt).toBe(NOW + c.intervalDays * DAY);
  });

  it('答錯立即重置：間隔回 1 天、repetitions 歸零、lapses 增加', () => {
    const after = schedule({ intervalDays: 17, ease: 270, repetitions: 4, lapses: 0 }, false, NOW);
    expect(after).toMatchObject({ intervalDays: 1, ease: 250, repetitions: 0, lapses: 1 });
    expect(after.dueAt).toBe(NOW + DAY);
  });

  it('ease 有上下限（130–300）', () => {
    let s = { ...base };
    for (let i = 0; i < 20; i++) s = schedule(s, true, NOW);
    expect(s.ease).toBe(300);
    for (let i = 0; i < 20; i++) s = schedule(s, false, NOW);
    expect(s.ease).toBe(130);
  });
});

describe('E1 TOTP 二步驗證', () => {
  it('產生合法 base32 secret，且可解回位元組', () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(base32Decode(s).length).toBeGreaterThanOrEqual(16);
  });

  it('產生的碼為 6 位數字，可驗證當前與前後一個時間窗', () => {
    const s = generateSecret();
    const token = totpAt(s, NOW);
    expect(token).toMatch(/^\d{6}$/);
    expect(verifyTotp(s, token, NOW)).toBe(true);
    expect(verifyTotp(s, totpAt(s, NOW - TOTP_STEP_SEC * 1000), NOW)).toBe(true);
    expect(verifyTotp(s, totpAt(s, NOW + TOTP_STEP_SEC * 1000), NOW)).toBe(true);
  });

  it('拒絕錯誤格式與過期視窗', () => {
    const s = generateSecret();
    expect(verifyTotp(s, 'abc', NOW)).toBe(false);
    expect(verifyTotp(s, '12345', NOW)).toBe(false);
    expect(verifyTotp(s, hotp(s, Math.floor(NOW / 1000 / TOTP_STEP_SEC) - 5), NOW)).toBe(false);
  });

  it('otpauth URL 帶上 secret 與帳號', () => {
    const s = generateSecret();
    const url = otpauthUrl(s, 'teacher@example.com');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain(s);
    expect(url).toContain('teacher%40example.com');
  });
});

describe('C1 試卷合規閘', () => {
  const q = [{ type: 'choice' as const, prompt: '1 + 1 = ?', choices: ['1', '2', '3'], answer: '2', tag: 'add' }];

  it('拒絕 NC／ND／無授權', () => {
    for (const license of ['CC BY-NC 4.0', 'CC BY-ND 4.0', '無授權']) {
      expect(() => assertPaperCompliance({ kind: 'licensed', license, licenseUrl: 'https://example.com/lic', retrievedAt: '2026-11-08', questions: q })).toThrow();
    }
  });

  it('開放授權卷必須齊備 license／條文連結／取用日期', () => {
    expect(() => assertPaperCompliance({ kind: 'licensed', license: 'CC BY 4.0', retrievedAt: '2026-11-08', questions: q })).toThrow(/授權條文連結/);
    expect(() => assertPaperCompliance({ kind: 'licensed', license: 'CC BY 4.0', licenseUrl: 'https://example.com/lic', retrievedAt: '2026-11-08', questions: q })).not.toThrow();
  });

  it('索引卷只存外連、不得存題目', () => {
    expect(() => assertPaperCompliance({ kind: 'index', sourceUrl: 'https://example.com/paper', questions: q })).toThrow(/不存題目/);
    expect(() => assertPaperCompliance({ kind: 'index', questions: [] })).toThrow(/原站連結/);
    expect(() => assertPaperCompliance({ kind: 'index', sourceUrl: 'https://example.com/paper', questions: [] })).not.toThrow();
  });

  it('原創卷必須有原創聲明；課本／TSA／補習社試卷一律拒絕', () => {
    expect(() => assertPaperCompliance({ kind: 'original', questions: q })).toThrow(/原創聲明/);
    expect(() => assertPaperCompliance({ kind: 'original', ownerDeclaration: true, questions: q })).not.toThrow();
    expect(() => assertPaperCompliance({ kind: 'original', ownerDeclaration: true, title: '某補習社 P6 模擬試卷', questions: q })).toThrow(/補習社/);
    expect(() => assertPaperCompliance({ kind: 'original', ownerDeclaration: true, title: 'TSA 歷屆試題', questions: q })).toThrow(/TSA/);
  });

  it('paperSchema 也拒絕「索引卷帶題目」', () => {
    expect(paperSchema.safeParse({ title: '索引', subject: 'math', grade: 3, kind: 'index', sourceUrl: 'https://example.com', questions: q }).success).toBe(false);
    expect(paperSchema.safeParse({ title: '原創卷', subject: 'math', grade: 3, kind: 'original', ownerDeclaration: true, questions: q }).success).toBe(true);
  });

  it('序列化後每題帶 paper: 前綴的 unit，且題序與答案不變', () => {
    const parsed = paperSchema.parse({ title: '原創卷', subject: 'math', grade: 3, kind: 'original', ownerDeclaration: true, questions: q });
    const out = JSON.parse(serializeQuestions(parsed.questions, 'p-123'));
    expect(out).toHaveLength(1);
    expect(out[0].unit).toBe('paper:p-123');
    expect(out[0].answer).toBe('2');
    expect(out[0].choices).toEqual(['1', '2', '3']);
    expect(parsed.adaptationNote ?? OWNER_DECLARATION).toBeTruthy();
  });
});

describe('B4 徽章定義', () => {
  it('五種徽章都有名稱、說明與提示，且代碼不重複', () => {
    expect(BADGE_DEFS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(BADGE_DEFS.map((b) => b.code)).size).toBe(BADGE_DEFS.length);
    for (const b of BADGE_DEFS) expect([b.name, b.desc, b.hint].every((s) => s.length > 0)).toBe(true);
  });
});

describe('C2 數學參數化單元', () => {
  const gens = allUnits().filter((u) => u.id.startsWith('mx-') && u.subject === 'math');

  it('P1–P6 各有一個參數化單元，且各自帶完整 lesson', () => {
    expect(gens).toHaveLength(6);
    for (let g = 1; g <= 6; g++) {
      const u = gens.find((x) => x.grade === g);
      expect(u, `mx P${g}`).toBeDefined();
      expect(u!.gens?.length).toBeGreaterThan(0);
      expect(u!.lesson?.points.length).toBeGreaterThanOrEqual(2);
      expect(u!.lesson?.pitfalls?.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('大量隨機種子下，標準答案都會被 isCorrect() 判為正確', () => {
    let checked = 0;
    for (const u of gens) {
      for (const seed of [1, 7, 42, 2026, 99991, 2 ** 30]) {
        for (const q of generateQuestions(u, 10, seed)) {
          expect(isCorrect(q, q.answer), `${u.id} seed=${seed} ${q.prompt} → ${q.answer}`).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(300);
  });
});
