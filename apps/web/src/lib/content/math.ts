import type { Unit, GenQuestion, Lesson } from './types';
import type { Rng } from './rng';
import { NAMES, dec, gcd, frac, reduce, num, fractionQ, textQ, choice } from './helpers';

type G = (r: Rng) => GenQuestion;
const U = (id: string, grade: number, title: string, intro: string[], tags: string[], gens: G[]): Unit => ({
  id, subject: 'math', grade, title, intro, tags, gens, source: 'builtin',
});

// ───────── P1 ─────────
const p1add: G[] = [
  (r) => { const a = r.int(1, 12), b = r.int(1, 20 - a); return num(`${a} + ${b} = ?`, a + b, 'p1-add20', `${a} 加 ${b}，由 ${a} 開始向上數 ${b} 個，得 ${a + b}。`); },
  (r) => { const b = r.int(2, 9), s = r.int(b + 1, 20); return num(`□ + ${b} = ${s}，□ 是多少？`, s - b, 'p1-add20', `${s} 減 ${b} 等於 ${s - b}。`); },
  (r) => { const n = r.pick(NAMES), a = r.int(3, 10), b = r.int(2, 10); return num(`${n}有 ${a} 粒糖，媽媽再給他 ${b} 粒，現在共有多少粒？`, a + b, 'p1-add20', `${a} + ${b} = ${a + b}`, '粒'); },
];
const p1sub: G[] = [
  (r) => { const a = r.int(5, 20), b = r.int(1, a - 1); return num(`${a} − ${b} = ?`, a - b, 'p1-sub20', `從 ${a} 向後數 ${b} 個，得 ${a - b}。`); },
  (r) => { const a = r.int(8, 20), b = r.int(2, a - 1); return num(`${a} − □ = ${a - b}，□ 是多少？`, b, 'p1-sub20', `${a} − ${a - b} = ${b}`); },
  (r) => { const n = r.pick(NAMES), a = r.int(8, 20), b = r.int(2, 7); return num(`${n}有 ${a} 個氣球，飛走了 ${b} 個，還剩下多少個？`, a - b, 'p1-sub20', `${a} − ${b} = ${a - b}`, '個'); },
];
const p1num: G[] = [
  (r) => { const a = r.int(10, 99); let b = r.int(10, 99); if (a === b) b = a === 99 ? 98 : a + 1; return choice(r, `${a} ○ ${b}，○ 應填哪個符號？`, a > b ? '>' : '<', [a > b ? '<' : '>', '='], 'p1-compare', '先比十位，十位相同再比個位。'); },
  (r) => { const n = r.int(11, 99); return num(`${n} 的十位數字是多少？`, Math.floor(n / 10), 'p1-place', `${n} 由 ${Math.floor(n / 10)} 個十和 ${n % 10} 個一組成。`); },
  (r) => { const n = r.int(11, 99); return num(`${n} 的個位數字是多少？`, n % 10, 'p1-place', `${n} 由 ${Math.floor(n / 10)} 個十和 ${n % 10} 個一組成。`); },
  (r) => { const s = r.int(20, 95); return num(`接著數：${s}，${s + 1}，${s + 2}，□`, s + 3, 'p1-sequence', '每次加 1。'); },
  (r) => { const d = r.int(1, 9), u = r.int(0, 9); return num(`${d} 個十和 ${u} 個一合起來是多少？`, d * 10 + u, 'p1-place', `${d}0 + ${u} = ${d * 10 + u}`); },
];
const p1money: G[] = [
  (r) => { const d1 = r.pick([5, 10]), d2 = r.pick([1, 2]), a = r.int(1, 3), b = r.int(1, 4); return num(`${a} 個 $${d1} 硬幣和 ${b} 個 $${d2} 硬幣，共多少元？`, a * d1 + b * d2, 'p1-money', `${a} × ${d1} + ${b} × ${d2} = ${a * d1 + b * d2}`, '元'); },
  (r) => { const p = r.int(2, 9), pay = r.pick([10, 20]); return num(`一枝鉛筆 $${p}，付 $${pay}，找回多少元？`, pay - p, 'p1-money', `${pay} − ${p} = ${pay - p}`, '元'); },
];

// ───────── P2 ─────────
const p2addsub: G[] = [
  (r) => { const a = r.int(15, 69), b = r.int(15, 99 - a); return num(`${a} + ${b} = ?`, a + b, 'p2-add100', `個位相加 ${a % 10} + ${b % 10}，滿 10 就向十位進 1。`); },
  (r) => { const a = r.int(41, 99), b = r.int(12, a - 1); return num(`${a} − ${b} = ?`, a - b, 'p2-sub100', '個位不夠減時，要從十位退 1。'); },
  (r) => { const n = r.pick(NAMES), a = r.int(25, 60), b = r.int(15, 39); return num(`${n}有 ${a} 張貼紙，朋友再送他 ${b} 張，現在共有多少張？`, a + b, 'p2-add100', `${a} + ${b} = ${a + b}`, '張'); },
  (r) => { const n = r.pick(NAMES), a = r.int(60, 98), b = r.int(18, 45); return num(`${n}有 ${a} 元，買玩具用了 ${b} 元，還剩多少元？`, a - b, 'p2-sub100', `${a} − ${b} = ${a - b}`, '元'); },
];
const p2times: G[] = [
  (r) => { const a = r.pick([2, 3, 4, 5, 10]), b = r.int(1, 10); return num(`${a} × ${b} = ?`, a * b, 'p2-times', `${a} 個 ${b} 相加，或背熟 ${a} 的乘法口訣。`); },
  (r) => { const n = r.pick(NAMES), a = r.pick([2, 3, 4, 5]), b = r.int(2, 9); return num(`每盒有 ${a} 枝蠟筆，${n}買了 ${b} 盒，一共有多少枝？`, a * b, 'p2-times', `${a} × ${b} = ${a * b}`, '枝'); },
  (r) => { const a = r.pick([2, 3, 4, 5]), b = r.int(2, 9); return num(`${a * b} 是 ${a} 的幾倍？`, b, 'p2-times', `${a} × ${b} = ${a * b}`, '倍'); },
];
const timeStr = (h: number, m: number) => `${h} 時${m === 0 ? '正' : ` ${m} 分`}`;
const p2time: G[] = [
  (r) => { const h = r.int(1, 11); return num(`${h} 時半即是 ${h} 時多少分？`, 30, 'p2-time', '半小時是 30 分鐘。', '分'); },
  (r) => { const h = r.int(1, 10), m = r.pick([0, 15, 30, 45]), add = r.pick([15, 30, 45]); const tot = h * 60 + m + add; const H = Math.floor(tot / 60), M = tot % 60;
    return choice(r, `現在是 ${timeStr(h, m)}，再過 ${add} 分鐘是幾時幾分？`, timeStr(H, M), [timeStr(H, (M + 15) % 60), timeStr(H + 1, M), timeStr(h, (m + add + 10) % 60)], 'p2-time', `先把時間加起來，滿 60 分就進成 1 小時。`); },
  (r) => { const h = r.int(1, 8), d = r.int(1, 4); return num(`${h} 時正再過 ${d} 小時是幾時？`, h + d, 'p2-time', `${h} + ${d} = ${h + d}`, '時'); },
  (r) => { const x = r.int(1, 4); return num(`${x} 小時是多少分鐘？`, x * 60, 'p2-time', `1 小時 = 60 分鐘，${x} × 60 = ${x * 60}。`, '分鐘'); },
];
const p2money: G[] = [
  (r) => { const a = r.int(12, 45), b = r.int(12, 45); return num(`買一本簿 $${a} 和一枝筆 $${b}，共用多少元？`, a + b, 'p2-money', `${a} + ${b} = ${a + b}`, '元'); },
  (r) => { const p = r.int(23, 78); return num(`一個書包 $${p}，付 $100，找回多少元？`, 100 - p, 'p2-money', `100 − ${p} = ${100 - p}`, '元'); },
  (r) => { const c = r.pick([2, 5, 10]), n = r.int(3, 9); return num(`${n} 個 $${c} 硬幣共多少元？`, c * n, 'p2-money', `${c} × ${n} = ${c * n}`, '元'); },
];

// ───────── P3 ─────────
const p3muldiv: G[] = [
  (r) => { const a = r.int(3, 9), b = r.int(3, 9); return num(`${a} × ${b} = ?`, a * b, 'p3-times', '背熟九九乘法表。'); },
  (r) => { const a = r.int(12, 49), b = r.int(2, 9); return num(`${a} × ${b} = ?`, a * b, 'p3-mul2d', `先算個位 ${a % 10} × ${b}，再算十位 ${Math.floor(a / 10)}0 × ${b}，最後相加。`); },
  (r) => { const b = r.int(3, 9), q = r.int(4, 12); return num(`${b * q} ÷ ${b} = ?`, q, 'p3-div', `想 ${b} × □ = ${b * q}。`); },
  (r) => { const b = r.int(3, 9), q = r.int(3, 9), rem = r.int(1, b - 1), a = b * q + rem; return num(`${a} ÷ ${b}，商是多少？`, q, 'p3-div-remainder', `${b} × ${q} = ${b * q}，${a} − ${b * q} = ${rem}，所以商是 ${q}，餘 ${rem}。`); },
  (r) => { const b = r.int(3, 9), q = r.int(3, 9), rem = r.int(1, b - 1), a = b * q + rem; return num(`${a} ÷ ${b}，餘數是多少？`, rem, 'p3-div-remainder', `${a} = ${b} × ${q} + ${rem}。`); },
];
const p3frac: G[] = [
  (r) => { const d = r.int(4, 10), a = r.int(1, d - 2), b = r.int(1, d - 1 - a); const [n, dd] = reduce(a + b, d); return fractionQ(`${frac(a, d)} + ${frac(b, d)} = ?（寫成最簡分數）`, frac(n, dd), 'p3-fraction-add', `分母相同，分子相加：${a} + ${b} = ${a + b}。`); },
  (r) => { const d = r.int(4, 10), a = r.int(2, d - 1), b = r.int(1, a - 1); const [n, dd] = reduce(a - b, d); return fractionQ(`${frac(a, d)} − ${frac(b, d)} = ?（寫成最簡分數）`, frac(n, dd), 'p3-fraction-add', `分母相同，分子相減：${a} − ${b} = ${a - b}。`); },
  (r) => { const d = r.int(5, 12); const a = r.int(1, d - 1); let b = r.int(1, d - 1); if (a === b) b = a === d - 1 ? a - 1 : a + 1; return choice(r, `${frac(a, d)} ○ ${frac(b, d)}，○ 應填哪個符號？`, a > b ? '>' : '<', [a > b ? '<' : '>', '='], 'p3-fraction-compare', '分母相同，分子大的分數較大。'); },
  (r) => { const d = r.int(4, 12), a = r.int(1, d - 1); return fractionQ(`把一個蛋糕平均分成 ${d} 份，吃了 ${a} 份，吃了這個蛋糕的幾分之幾？`, frac(a, d), 'p3-fraction-meaning', `${a} 份 ÷ 共 ${d} 份 = ${frac(a, d)}`, false); },
];
const p3peri: G[] = [
  (r) => { const l = r.int(6, 20), w = r.int(3, l - 1); return num(`長方形的長是 ${l} 厘米，闊是 ${w} 厘米，周界是多少厘米？`, 2 * (l + w), 'p3-perimeter', `周界 = (長 + 闊) × 2 = (${l} + ${w}) × 2 = ${2 * (l + w)}`, '厘米'); },
  (r) => { const s = r.int(3, 15); return num(`正方形的邊長是 ${s} 厘米，周界是多少厘米？`, 4 * s, 'p3-perimeter', `周界 = 邊長 × 4 = ${s} × 4 = ${4 * s}`, '厘米'); },
  (r) => { const a = r.int(5, 12), b = r.int(5, 12), c = r.int(5, 12); return num(`三角形三條邊分別是 ${a} 厘米、${b} 厘米和 ${c} 厘米，周界是多少厘米？`, a + b + c, 'p3-perimeter', `把三條邊相加：${a + b + c}`, '厘米'); },
];
const p3big: G[] = [
  (r) => { const n = r.int(1000, 9999); const pos = r.pick([['千位', Math.floor(n / 1000)], ['百位', Math.floor(n / 100) % 10], ['十位', Math.floor(n / 10) % 10], ['個位', n % 10]] as const); return num(`${n} 的${pos[0]}數字是多少？`, pos[1], 'p3-place-value', `${n} 的各位數字：千 ${Math.floor(n / 1000)}、百 ${Math.floor(n / 100) % 10}、十 ${Math.floor(n / 10) % 10}、個 ${n % 10}。`); },
  (r) => { const a = r.int(1, 9), b = r.int(0, 9), c = r.int(0, 9), d = r.int(0, 9); return num(`${a * 1000} + ${b * 100} + ${c * 10} + ${d} = ?`, a * 1000 + b * 100 + c * 10 + d, 'p3-place-value', '把各位的數值加起來。'); },
  (r) => { const a = r.int(1200, 8800), b = r.int(300, 900); return num(`${a} + ${b} = ?`, a + b, 'p3-add-big', '直式計算，由個位開始逐位相加。'); },
  (r) => { const a = r.int(3000, 9000), b = r.int(500, 2900); return num(`${a} − ${b} = ?`, a - b, 'p3-add-big', '直式計算，由個位開始逐位相減，不夠減就向前一位退 1。'); },
];

// ───────── P4 ─────────
const p4mixed: G[] = [
  (r) => { const a = r.int(5, 30), b = r.int(2, 9), c = r.int(2, 9); return num(`${a} + ${b} × ${c} = ?`, a + b * c, 'p4-order', `先乘後加：${b} × ${c} = ${b * c}，再加 ${a}。`); },
  (r) => { const a = r.int(3, 15), b = r.int(2, 12), c = r.int(2, 9); return num(`(${a} + ${b}) × ${c} = ?`, (a + b) * c, 'p4-order', `先算括號內：${a} + ${b} = ${a + b}。`); },
  (r) => { const c = r.int(2, 9), q = r.int(3, 12), d = r.int(1, 9), a = c * q + d; return num(`(${a} − ${d}) ÷ ${c} + 1 = ?`, q + 1, 'p4-order', `括號內 ${a} − ${d} = ${a - d}，除以 ${c} 得 ${q}，再加 1。`); },
  (r) => { const a = r.int(4, 9), b = r.int(3, 9), c = r.int(2, a * b - 1); return num(`${a} × ${b} − ${c} = ?`, a * b - c, 'p4-order', `先乘後減：${a} × ${b} = ${a * b}。`); },
];
const p4dec: G[] = [
  (r) => { const a = r.int(11, 99), b = r.int(11, 99); return num(`${dec(a, 1)} + ${dec(b, 1)} = ?`, dec(a + b, 1), 'p4-decimal', '小數點對齊，再逐位相加。'); },
  (r) => { const a = r.int(300, 999), b = r.int(101, a - 1); return num(`${dec(a, 2)} − ${dec(b, 2)} = ?`, dec(a - b, 2), 'p4-decimal', '小數點對齊，再逐位相減。'); },
  (r) => { const a = r.int(100, 900), b = r.int(100, 900); return num(`${dec(a, 2)} + ${dec(b, 2)} = ?`, dec(a + b, 2), 'p4-decimal', '小數點對齊，再逐位相加。'); },
];
const p4area: G[] = [
  (r) => { const l = r.int(5, 20), w = r.int(3, 15); return num(`長方形的長是 ${l} 厘米，闊是 ${w} 厘米，面積是多少平方厘米？`, l * w, 'p4-area', `面積 = 長 × 闊 = ${l} × ${w}`, '平方厘米'); },
  (r) => { const s = r.int(3, 15); return num(`正方形的邊長是 ${s} 厘米，面積是多少平方厘米？`, s * s, 'p4-area', `面積 = 邊長 × 邊長 = ${s} × ${s}`, '平方厘米'); },
  (r) => { const l = r.int(4, 12), w = r.int(3, 9); return num(`長方形的面積是 ${l * w} 平方厘米，長是 ${l} 厘米，闊是多少厘米？`, w, 'p4-area', `闊 = 面積 ÷ 長 = ${l * w} ÷ ${l}`, '厘米'); },
];
const p4fracs: G[] = [
  (r) => { const [n, d] = r.pick([[2, 4], [3, 6], [4, 8], [6, 9], [4, 10], [6, 8], [9, 12], [10, 15], [8, 12]] as const); const [rn, rd] = reduce(n, d); return fractionQ(`把 ${frac(n, d)} 化成最簡分數。`, frac(rn, rd), 'p4-simplify', `分子和分母同時除以最大公因數 ${gcd(n, d)}。`); },
  (r) => { const [n, d] = r.pick([[1, 2], [3, 4], [2, 3], [1, 3], [3, 5], [5, 6]] as const), k = r.int(2, 5); return num(`${frac(n, d)} = □/${d * k}，□ 是多少？`, n * k, 'p4-equivalent', `分母乘 ${k}，分子也要乘 ${k}。`); },
  (r) => { let d = r.int(2, 6), n = r.int(1, d - 1); while (gcd(n, d) !== 1) { d = r.int(2, 6); n = r.int(1, d - 1); } const w = r.int(1, 4); return fractionQ(`把假分數 ${frac(w * d + n, d)} 化成帶分數（例：1 1/2）。`, `${w} ${n}/${d}`, 'p4-mixed-number', `${w * d + n} ÷ ${d} = ${w} 餘 ${n}。`, false); },
];
const p4mul: G[] = [
  (r) => { const a = r.int(102, 489), b = r.int(12, 39); return num(`${a} × ${b} = ?`, a * b, 'p4-mul-multi', '直式計算：先乘個位，再乘十位，最後相加。'); },
  (r) => { const a = r.int(12, 99), b = r.int(12, 99); return num(`${a} × ${b} = ?`, a * b, 'p4-mul-multi', '直式計算：先乘個位，再乘十位，最後相加。'); },
  (r) => { const b = r.int(12, 35), q = r.int(11, 60); return num(`${b * q} ÷ ${b} = ?`, q, 'p4-div-multi', `想 ${b} × □ = ${b * q}。`); },
];

// ───────── P5 ─────────
const p5dec: G[] = [
  (r) => { const a = r.int(11, 99), b = r.int(11, 99); return num(`${dec(a, 1)} × ${dec(b, 1)} = ?`, dec(a * b, 2), 'p5-decimal-mul', `先當作整數 ${a} × ${b} = ${a * b}，再數小數位共 2 位。`); },
  (r) => { const a = r.int(12, 99), b = r.int(2, 9); return num(`${dec(a, 1)} × ${b} = ?`, dec(a * b, 1), 'p5-decimal-mul', `先當作整數 ${a} × ${b} = ${a * b}，再補回 1 位小數。`); },
  (r) => { const b = r.int(2, 9), q = r.int(11, 99); return num(`${dec(b * q, 1)} ÷ ${b} = ?`, dec(q, 1), 'p5-decimal-div', `${b * q} ÷ ${b} = ${q}，再補回 1 位小數。`); },
  (r) => { const b = r.int(2, 9), q = r.int(11, 60); return num(`${dec(b * q, 1)} ÷ ${dec(b, 1)} = ?`, q, 'p5-decimal-div', `除數和被除數同時乘 10：${b * q} ÷ ${b}。`); },
];
const p5frac: G[] = [
  (r) => { const [d1, d2] = r.pick([[2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [2, 7], [3, 7]] as const), b = r.int(1, d2 - 1); const n = d2 + b * d1, d = d1 * d2; const [rn, rd] = reduce(n, d); return fractionQ(`${frac(1, d1)} + ${frac(b, d2)} = ?（最簡分數）`, frac(rn, rd), 'p5-fraction-unlike', `先通分，分母變成 ${d}，再相加。`); },
  (r) => { const [a, d1, b, d2] = r.pick([[3, 4, 1, 6], [2, 3, 1, 6], [3, 5, 1, 2], [5, 6, 1, 3], [3, 4, 2, 5], [4, 5, 1, 2], [5, 8, 1, 4], [2, 3, 1, 4], [5, 6, 1, 4]] as const); const n = a * d2 - b * d1, d = d1 * d2; const [rn, rd] = reduce(n, d); return fractionQ(`${frac(a, d1)} − ${frac(b, d2)} = ?（最簡分數）`, frac(rn, rd), 'p5-fraction-unlike', `先通分，分母變成 ${d}，再相減。`); },
  (r) => { const a = r.int(1, 4), b = r.int(a + 1, 6), c = r.int(1, 4), d = r.int(c + 1, 6); const [rn, rd] = reduce(a * c, b * d); return fractionQ(`${frac(a, b)} × ${frac(c, d)} = ?（最簡分數）`, frac(rn, rd), 'p5-fraction-mul', '分子乘分子，分母乘分母，再約簡。'); },
];
const p5pct: G[] = [
  (r) => { const p = r.int(1, 99); return num(`把 ${dec(p, 2)} 寫成百分數（只填數字，不用寫 %）。`, p, 'p5-percent', `${dec(p, 2)} = ${p}/100 = ${p}%`, '%'); },
  (r) => { const p = r.pick([10, 20, 25, 30, 40, 50, 60, 75]), base = r.pick([40, 60, 80, 120, 200, 240, 400]); return num(`${base} 的 ${p}% 是多少？`, (base * p) / 100, 'p5-percent-of', `${base} × ${p}/100 = ${(base * p) / 100}`); },
  (r) => { const p = r.pick([10, 20, 25, 40, 50, 60, 75, 80]), base = r.pick([20, 40, 80, 100, 200]); return num(`${(base * p) / 100} 是 ${base} 的百分之幾？（只填數字）`, p, 'p5-percent-of', `${(base * p) / 100} ÷ ${base} × 100 = ${p}`, '%'); },
];
const p5avg: G[] = [
  (r) => { const k = r.pick([3, 4, 5]), avg = r.int(60, 90); let xs: number[] = []; for (let t = 0; t < 200; t++) { xs = Array.from({ length: k - 1 }, () => r.int(avg - 12, Math.min(100, avg + 12))); const last = avg * k - xs.reduce((a, b) => a + b, 0); if (last >= 40 && last <= 100) { xs.push(last); break; } } if (xs.length < k) xs = Array(k).fill(avg); return num(`${k} 次測驗的分數分別是 ${xs.join('、')}，平均分是多少？`, avg, 'p5-average', `總和 ${avg * k} ÷ ${k} = ${avg}。`, '分'); },
  (r) => { const k = r.pick([4, 5, 6]), avg = r.int(20, 50); return num(`${k} 個數的平均數是 ${avg}，這 ${k} 個數的總和是多少？`, avg * k, 'p5-average', `總和 = 平均數 × 個數 = ${avg} × ${k}`); },
];
const p5vol: G[] = [
  (r) => { const l = r.int(3, 12), w = r.int(2, 9), h = r.int(2, 9); return num(`長方體的長 ${l} 厘米、闊 ${w} 厘米、高 ${h} 厘米，體積是多少立方厘米？`, l * w * h, 'p5-volume', `體積 = 長 × 闊 × 高 = ${l} × ${w} × ${h}`, '立方厘米'); },
  (r) => { const s = r.int(2, 9); return num(`正方體的邊長是 ${s} 厘米，體積是多少立方厘米？`, s ** 3, 'p5-volume', `體積 = ${s} × ${s} × ${s}`, '立方厘米'); },
];

// ───────── P6 ─────────
const p6ratio: G[] = [
  (r) => { const [a, b] = r.pick([[2, 3], [3, 5], [1, 4], [3, 4], [2, 5], [4, 7], [1, 3], [5, 6]] as const), g = r.int(2, 6); return textQ(`男生 ${a * g} 人，女生 ${b * g} 人，男生人數與女生人數的比是多少？（最簡整數比，例 2:3）`, `${a}:${b}`, 'p6-ratio', `${a * g}:${b * g}，同除以 ${g} 得 ${a}:${b}。`, [`${a}：${b}`]); },
  (r) => { const a = r.int(2, 5), b = r.int(a + 1, 8), k = r.int(2, 9); return num(`甲與乙的比是 ${a}:${b}。若甲是 ${a * k}，乙是多少？`, b * k, 'p6-ratio', `每份是 ${a * k} ÷ ${a} = ${k}，乙 = ${b} × ${k}。`); },
  (r) => { const a = r.int(1, 4), b = r.int(a + 1, 6), k = r.int(10, 40); return num(`把 $${(a + b) * k} 按 ${a}:${b} 分給兩人，較多的一份是多少元？`, b * k, 'p6-ratio-share', `共 ${a + b} 份，每份 ${k} 元，較多的一份有 ${b} 份。`, '元'); },
];
const p6pct: G[] = [
  (r) => { const price = r.pick([100, 200, 250, 400, 500, 800]), off = r.pick([10, 20, 25, 30, 40]); return num(`一件貨品原價 $${price}，減價 ${off}% 後，售價是多少元？`, (price * (100 - off)) / 100, 'p6-discount', `售價 = 原價 × (100 − ${off})% = ${price} × ${100 - off}%`, '元'); },
  (r) => { const price = r.pick([100, 200, 250, 400, 500]), up = r.pick([10, 20, 25, 30, 50]); return num(`某貨品成本 $${price}，加價 ${up}% 出售，售價是多少元？`, (price * (100 + up)) / 100, 'p6-markup', `售價 = 成本 × (100 + ${up})%`, '元'); },
  (r) => { const price = r.pick([100, 200, 400, 500, 800]), z = r.pick([5, 6, 7, 8, 9]); return num(`一件貨品原價 $${price}，打 ${z} 折出售，售價是多少元？`, (price * z) / 10, 'p6-discount', `打 ${z} 折即是原價的 ${z}0%。`, '元'); },
];
const p6speed: G[] = [
  (r) => { const v = r.pick([40, 50, 60, 80, 90]), t = r.int(2, 5); return num(`汽車以每小時 ${v} 公里的速率行駛 ${t} 小時，共行了多少公里？`, v * t, 'p6-speed', `路程 = 速率 × 時間 = ${v} × ${t}`, '公里'); },
  (r) => { const v = r.pick([40, 50, 60, 80]), t = r.int(2, 6); return num(`一輛車行了 ${v * t} 公里，用了 ${t} 小時，平均速率是每小時多少公里？`, v, 'p6-speed', `速率 = 路程 ÷ 時間 = ${v * t} ÷ ${t}`, '公里/小時'); },
  (r) => { const v = r.pick([30, 40, 60, 90]), t = r.int(2, 5); return num(`以每小時 ${v} 公里的速率行 ${v * t} 公里，需要多少小時？`, t, 'p6-speed', `時間 = 路程 ÷ 速率 = ${v * t} ÷ ${v}`, '小時'); },
];
const p6alg: G[] = [
  (r) => { const a = r.int(2, 9), x = r.int(2, 15), b = r.int(1, 20); return num(`解方程：${a}x + ${b} = ${a * x + b}，x = ?`, x, 'p6-equation', `${a}x = ${a * x + b} − ${b} = ${a * x}，x = ${a * x} ÷ ${a}。`); },
  (r) => { const a = r.int(2, 9), x = r.int(3, 20), b = r.int(1, a * x - 1); return num(`解方程：${a}x − ${b} = ${a * x - b}，x = ?`, x, 'p6-equation', `${a}x = ${a * x - b} + ${b} = ${a * x}，x = ${a * x} ÷ ${a}。`); },
  (r) => { const k = r.int(2, 6), x = r.int(2, 12), b = r.int(1, 9); return num(`解方程：${k}(x + ${b}) = ${k * (x + b)}，x = ?`, x, 'p6-equation', `兩邊同除以 ${k}：x + ${b} = ${x + b}，x = ${x}。`); },
];
const p6circle: G[] = [
  (r) => { const rad = r.int(2, 15); return num(`圓的半徑是 ${rad} 厘米，圓周是多少厘米？（π 取 3.14）`, dec(2 * 314 * rad, 2), 'p6-circle', `圓周 = 2 × π × 半徑 = 2 × 3.14 × ${rad}`, '厘米'); },
  (r) => { const rad = r.int(2, 12); return num(`圓的半徑是 ${rad} 厘米，圓面積是多少平方厘米？（π 取 3.14）`, dec(314 * rad * rad, 2), 'p6-circle', `圓面積 = π × 半徑 × 半徑 = 3.14 × ${rad} × ${rad}`, '平方厘米'); },
  (r) => { const d = r.int(3, 20); return num(`圓的直徑是 ${d} 厘米，圓周是多少厘米？（π 取 3.14）`, dec(314 * d, 2), 'p6-circle', `圓周 = π × 直徑 = 3.14 × ${d}`, '厘米'); },
];

// ───────── C2 參數化題庫：mx- 前綴，自帶 lesson，難度對齊既有 P1–P6 分級 ─────────
const MU = (id: string, grade: number, title: string, intro: string[], tags: string[], gens: G[], lesson: Lesson): Unit => ({
  id, subject: 'math', grade, title, intro, tags, gens, source: 'builtin', lesson,
});

const mxP1: G[] = [
  (r) => { const a = r.int(1, 19), b = r.int(1, 20 - a); return num(`計算：${a} + ${b} = ?`, a + b, 'mx-p1-add20', `由 ${a} 開始向上數 ${b} 個，得 ${a + b}。`); },
  (r) => { const a = r.int(2, 20), b = r.int(1, a - 1); return num(`計算：${a} − ${b} = ?`, a - b, 'mx-p1-sub20', `由 ${a} 向後數 ${b} 個，得 ${a - b}。`); },
  (r) => { const n = r.pick(NAMES), a = r.int(1, 15), b = r.int(1, 20 - a); return num(`${n}有 ${a} 粒糖，再得到 ${b} 粒，共有多少粒？`, a + b, 'mx-p1-add20', `${a} + ${b} = ${a + b}`, '粒'); },
  (r) => { const b = r.int(2, 9), s = r.int(b + 1, 20); return num(`□ + ${b} = ${s}，□ 是多少？`, s - b, 'mx-p1-add20', `${s} − ${b} = ${s - b}`); },
  (r) => { const a = r.int(2, 9), b = r.int(2, 9); return choice(r, `選出 ${a} + ${b} 的正確答案`, String(a + b), [String(a + b + 1), String(a + b - 1), String(a + b + 2)], 'mx-p1-add20', `${a} + ${b} = ${a + b}。`); },
];

const mxP2: G[] = [
  (r) => { const a = r.pick([2, 3, 4, 5, 10]), b = r.int(1, 10); return num(`計算：${a} × ${b} = ?`, a * b, 'mx-p2-times', `${a} 個 ${b} 相加 = ${a * b}。`); },
  (r) => { const n = r.pick(NAMES), a = r.pick([2, 3, 4, 5, 10]), b = r.int(2, 9); return num(`每盒有 ${a} 枝鉛筆，${n}買了 ${b} 盒，共有多少枝？`, a * b, 'mx-p2-times', `${a} × ${b} = ${a * b}`, '枝'); },
  (r) => { const a = r.pick([2, 3, 4, 5, 10]), b = r.int(2, 9); return num(`${a * b} 是 ${a} 的幾倍？`, b, 'mx-p2-times', `${a} × ${b} = ${a * b}`, '倍'); },
  (r) => { const a = r.pick([2, 3, 4, 5, 10]), b = r.int(1, 10); return choice(r, `選出 ${a} × ${b} 的正確答案`, String(a * b), [String(a * b + a), String(a * b - a), String(a * b + 1)], 'mx-p2-times', `背熟 ${a} 的乘法口訣。`); },
  (r) => { const a = r.pick([2, 3, 4, 5, 10]), b = r.int(2, 9), c = r.int(1, 9); return num(`計算：${a} × ${b} + ${c} = ?`, a * b + c, 'mx-p2-times', `先算 ${a} × ${b} = ${a * b}，再加 ${c}。`); },
];

const mxP3: G[] = [
  (r) => { const a = r.int(100, 899), b = r.int(100, 999 - a); return num(`計算：${a} + ${b} = ?`, a + b, 'mx-p3-add3', '直式相加，個位滿 10 要向十位進 1。'); },
  (r) => { const a = r.int(300, 999), b = r.int(100, a - 1); return num(`計算：${a} − ${b} = ?`, a - b, 'mx-p3-sub3', '直式相減，個位不夠減要向十位退 1。'); },
  (r) => { const b = r.int(2, 9), q = r.int(3, 20); return num(`計算：${b * q} ÷ ${b} = ?`, q, 'mx-p3-div', `想 ${b} × □ = ${b * q}。`); },
  (r) => { const b = r.int(2, 9), q = r.int(3, 12), rem = r.int(1, b - 1), a = b * q + rem; return num(`${a} ÷ ${b} 的商是多少？`, q, 'mx-p3-div-rem', `${b} × ${q} = ${b * q}，餘 ${rem}，所以商是 ${q}。`); },
  (r) => { const a = r.int(100, 800), b = r.int(100, 999 - a); return choice(r, `選出 ${a} + ${b} 的正確答案`, String(a + b), [String(a + b + 10), String(a + b - 10), String(a + b + 1)], 'mx-p3-add3', `直式相加得 ${a + b}。`); },
];

const mxP4: G[] = [
  (r) => { const a = r.int(2, 20), b = r.int(2, 9), c = r.int(2, 9); return num(`計算：${a} + ${b} × ${c} = ?`, a + b * c, 'mx-p4-order', `先乘後加：${b} × ${c} = ${b * c}。`); },
  (r) => { const a = r.int(3, 15), b = r.int(2, 12), c = r.int(2, 9); return num(`計算：(${a} + ${b}) × ${c} = ?`, (a + b) * c, 'mx-p4-order', `先算括號：${a} + ${b} = ${a + b}。`); },
  (r) => { const a = r.int(2, 9), b = r.int(2, 9), c = r.int(1, Math.min(9, a * b - 1)); return num(`計算：${a} × ${b} − ${c} = ?`, a * b - c, 'mx-p4-order', `先乘後減：${a} × ${b} = ${a * b}。`); },
  (r) => { const b = r.int(2, 9), q = r.int(2, 12), d = r.int(1, 9), a = b * q + d; return num(`計算：(${a} − ${d}) ÷ ${b} = ?`, q, 'mx-p4-order', `括號內 ${a} − ${d} = ${a - d}。`); },
  (r) => { const a = r.int(2, 20), b = r.int(2, 9), c = r.int(2, 9); return choice(r, `選出 ${a} + ${b} × ${c} 的正確答案`, String(a + b * c), [String(a + b * c + 1), String(a + b * c + 2), String(a + b * c - 1)], 'mx-p4-order', `先算 ${b} × ${c} = ${b * c}。`); },
];

const mxP5: G[] = [
  (r) => { const p = r.int(1, 99); return num(`把 ${dec(p, 2)} 寫成百分數（只填數字，不用寫 %）`, p, 'mx-p5-percent', `${dec(p, 2)} = ${p}/100 = ${p}%`, '%'); },
  (r) => { const p = r.pick([10, 20, 25, 40, 50, 75]), base = r.pick([40, 60, 80, 120, 200, 240]); return num(`${base} 的 ${p}% 是多少？`, (base * p) / 100, 'mx-p5-percent-of', `${base} × ${p}/100 = ${(base * p) / 100}`); },
  (r) => { const a = r.int(11, 99), b = r.int(11, 99); return num(`計算：${dec(a, 1)} × ${dec(b, 1)} = ?`, dec(a * b, 2), 'mx-p5-decimal-mul', `先當整數 ${a} × ${b} = ${a * b}，再補回 2 位小數。`); },
  (r) => { const p = r.pick([20, 25, 40, 50, 60, 75, 80]); const [n, d] = reduce(p, 100); return fractionQ(`把 ${p}% 化成最簡分數。`, frac(n, d), 'mx-p5-percent-fraction', `${p}% = ${p}/100，分子分母同除以 ${gcd(p, 100)}。`); },
  (r) => { const b = r.int(2, 9), q = r.int(11, 60); return num(`計算：${dec(b * q, 1)} ÷ ${b} = ?`, dec(q, 1), 'mx-p5-decimal-div', `${dec(b * q, 1)} ÷ ${b} = ${dec(q, 1)}。`); },
];

const mxP6: G[] = [
  (r) => { const [a, b] = r.pick([[2, 3], [3, 5], [1, 4], [3, 4], [2, 5], [4, 7]] as const), g = r.int(2, 9); return choice(r, `把 ${a * g}:${b * g} 化成最簡整數比`, `${a}:${b}`, [`${a * g}:${b * g}`, `${b}:${a}`, `${a}:${b * 2}`], 'mx-p6-ratio', `兩數同除以 ${g} 得 ${a}:${b}。`); },
  (r) => { const price = r.pick([100, 200, 400, 500, 800]), off = r.pick([10, 20, 25, 30, 40]); return num(`原價 $${price}，減價 ${off}%，售價是多少元？`, (price * (100 - off)) / 100, 'mx-p6-discount', `售價 = ${price} × ${100 - off}% = ${(price * (100 - off)) / 100}`, '元'); },
  (r) => { const v = r.pick([40, 50, 60, 80]), t = r.int(2, 6); return num(`汽車每小時行 ${v} 公里，${t} 小時共行多少公里？`, v * t, 'mx-p6-speed', `路程 = 速率 × 時間 = ${v} × ${t}`, '公里'); },
  (r) => { const a = r.int(2, 9), x = r.int(2, 15), b = r.int(1, 20); return num(`解方程：${a}x + ${b} = ${a * x + b}，x = ?`, x, 'mx-p6-equation', `${a}x = ${a * x + b} − ${b} = ${a * x}，所以 x = ${x}。`); },
  (r) => { const rad = r.int(2, 15); return num(`圓的半徑是 ${rad} 厘米，圓周是多少厘米？（π 取 3.14）`, dec(2 * 314 * rad, 2), 'mx-p6-circle', `圓周 = 2 × 3.14 × ${rad}`, '厘米'); },
];

const MX_UNITS: Unit[] = [
  MU('mx-p1-addsub20', 1, '20 以內加減（參數化）', ['把兩個數合起來用加法；拿走一部分用減法。'], ['mx-p1-add20', 'mx-p1-sub20'], mxP1, {
    points: [
      '20 以內的加法可以用「湊十法」：先把其中一個數補到 10，再把剩下的加起來。',
      '減法可以想成加法的倒轉：要算 13 − 5，就找「5 加多少等於 13」。',
      '看到「共有」「剩下」先判斷用加還是減，再把題目的數字代入算式。',
    ],
    pitfalls: ['把「飛走／用去」誤用加法；題目說拿走一部分時要用減法。', '進位或退位時漏算十位，建議畫圈逐一點數檢查。'],
  }),
  MU('mx-p2-times', 2, '2、3、4、5、10 的乘法（參數化）', ['乘法是相同數目連加的快捷方法。'], ['mx-p2-times'], mxP2, {
    points: [
      '乘法是相同數目連加的快捷方法，例如 4 × 3 就是 4 + 4 + 4 = 12。',
      '熟記 2、3、4、5、10 的乘法口訣；任何整數乘 10 只要在末尾補一個 0。',
      '「幾倍」的問題用乘法；反過來求倍數時，用除法想「□ × a = 積」。',
    ],
    pitfalls: ['把 a × b 與 a + b 混淆，尤其 2 × 2 與 2 + 2 答案相同時最容易忽略差別。', '算式中同時有「×」與「+」時，忘記先乘後加。'],
  }),
  MU('mx-p3-addsubdiv', 3, '三位數加減與基本除法（參數化）', ['大數加減要對齊數位；除法是乘法的倒轉。'], ['mx-p3-add3', 'mx-p3-sub3', 'mx-p3-div', 'mx-p3-div-rem'], mxP3, {
    points: [
      '三位數加減要寫直式，把個位、十位、百位對齊；滿 10 進位、不夠減退位。',
      '除法是乘法的倒轉：算 56 ÷ 7 時，想 7 × □ = 56。',
      '不能整除時，餘數一定比除數小；先求商，再用「被除數 − 除數 × 商」求餘數。',
    ],
    pitfalls: ['直式沒有對齊數位，或進位／退位忘記加減 1。', '把餘數當成商，或寫出比除數還大的餘數。'],
  }),
  MU('mx-p4-order', 4, '四則混合與運算次序（參數化）', ['先括號、再乘除、最後加減。'], ['mx-p4-order'], mxP4, {
    points: [
      '四則混合的次序：先算括號，再算乘除（由左至右），最後才算加減。',
      '沒有括號時，先乘除後加減；有括號一定要先處理括號內的結果。',
      '把每一步的結果寫在算式下方，驗算時逐一步驟比對，較容易找出錯處。',
    ],
    pitfalls: ['從左到右一路算到底，忽略「先乘除後加減」。', '括號漏乘，例如把 (3 + 4) × 5 錯算成 3 + 4 × 5。'],
  }),
  MU('mx-p5-pctdec', 5, '百分數與小數（參數化）', ['百分數是分母為 100 的分數；小數相乘要注意小數位。'], ['mx-p5-percent', 'mx-p5-percent-of', 'mx-p5-decimal-mul', 'mx-p5-decimal-div', 'mx-p5-percent-fraction'], mxP5, {
    points: [
      '百分數是分母為 100 的分數：35% = 35/100 = 0.35，三種寫法可以互相轉換。',
      '求「某數的百分之幾」用乘法：base × p ÷ 100；反過來求百分比時用除法再乘 100。',
      '小數相乘先當整數計算，再數兩個因數共有幾位小數，最後補回小數點。',
    ],
    pitfalls: ['把 0.5 寫成 5% 而不是 50%；小數轉百分數要乘 100。', '小數乘法漏數小數位，或小數加減沒有對齊小數點。'],
  }),
  MU('mx-p6-mixed', 6, '比、折扣、速率、方程與圓周（參數化）', ['綜合運用比、百分數、速率與圓周公式。'], ['mx-p6-ratio', 'mx-p6-discount', 'mx-p6-speed', 'mx-p6-equation', 'mx-p6-circle'], mxP6, {
    points: [
      '比可以像分數般約簡；按比分配時先求總份數，再求每份是多少。',
      '減價 p% 即售價為原價的 (100 − p)%；速率、路程、時間的關係是「路程 = 速率 × 時間」。',
      '解方程要保持兩邊平衡，先移走常數項再除以 x 前面的係數；圓周 = 2 × π × 半徑。',
    ],
    pitfalls: ['折扣題把「減價 20%」誤算成原價乘 20%，正確是乘 80%。', '解方程移項時忘記變號，或把圓周與圓面積公式混用。'],
  }),
];

export const MATH_UNITS: Unit[] = [
  U('m1-add20', 1, '20 以內加法', ['把兩個數合起來，用加法。例：8 + 5，先把 8 湊成 10（需要 2），5 分成 2 和 3，10 + 3 = 13。'], ['p1-add20'], p1add),
  U('m1-sub20', 1, '20 以內減法', ['拿走一部分，用減法。可以想「加法倒轉」：13 − 5，因為 5 + 8 = 13，所以答案是 8。'], ['p1-sub20'], p1sub),
  U('m1-num100', 1, '100 以內的數', ['兩位數由「十位」和「個位」組成，例：47 = 4 個十 + 7 個一。比較大小：先比十位，十位一樣才比個位。'], ['p1-compare', 'p1-place', 'p1-sequence'], p1num),
  U('m1-money', 1, '認識港幣', ['常用硬幣有 $1、$2、$5、$10。計算時，先把同一種硬幣的總值算出來，再相加。'], ['p1-money'], p1money),
  U('m2-addsub100', 2, '100 以內加減', ['做直式要把個位和個位、十位和十位對齊。個位滿 10 要「進位」；個位不夠減要「退位」。'], ['p2-add100', 'p2-sub100'], p2addsub),
  U('m2-times', 2, '乘法（2、3、4、5、10）', ['乘法是「相同數目相加」的快捷方法：4 × 3 = 4 + 4 + 4 = 12。多唸乘法口訣，計得又快又準。'], ['p2-times'], p2times),
  U('m2-time', 2, '時間', ['1 小時 = 60 分鐘。「半」是 30 分鐘，「一刻」是 15 分鐘。時間加分鐘，滿 60 分就進成 1 小時。'], ['p2-time'], p2time),
  U('m2-money', 2, '港幣計算', ['買東西要加起來才知道共用多少錢；付款減去貨價就是找回的錢。解應用題先圈出數字，想清楚用加還是減。'], ['p2-money'], p2money),
  U('m3-muldiv', 3, '乘法與除法', ['除法是乘法倒轉：56 ÷ 7 = 8，因為 7 × 8 = 56。不能整除時有餘數，餘數一定比除數小。'], ['p3-times', 'p3-mul2d', 'p3-div', 'p3-div-remainder'], p3muldiv),
  U('m3-fraction', 3, '分數入門', ['把整體平均分成若干份，取其中幾份就是分數。分母是總份數，分子是取了的份數。分母相同的分數可以直接加減分子。'], ['p3-fraction-add', 'p3-fraction-compare', 'p3-fraction-meaning'], p3frac),
  U('m3-perimeter', 3, '周界', ['周界是圖形一周的長度。長方形周界 = (長 + 闊) × 2；正方形周界 = 邊長 × 4。'], ['p3-perimeter'], p3peri),
  U('m3-bignum', 3, '萬以內的數', ['四位數由千位、百位、十位和個位組成。大數加減同樣要把相同數位對齊。'], ['p3-place-value', 'p3-add-big'], p3big),
  U('m4-mixed', 4, '四則運算', ['運算次序：先算括號內，再算乘除（由左至右），最後才算加減。'], ['p4-order'], p4mixed),
  U('m4-decimal', 4, '小數加減', ['做小數加減，一定要把小數點對齊。位數不夠時可以在後面補 0，例：3.6 = 3.60。'], ['p4-decimal'], p4dec),
  U('m4-area', 4, '面積', ['面積是圖形所佔的平面大小。長方形面積 = 長 × 闊；正方形面積 = 邊長 × 邊長。單位是平方厘米。'], ['p4-area'], p4area),
  U('m4-fraction', 4, '分數的等值與約簡', ['分子和分母同時乘（或除以）同一個數，分數的值不變。約簡到不能再約，就是最簡分數。假分數可以化成帶分數。'], ['p4-simplify', 'p4-equivalent', 'p4-mixed-number'], p4fracs),
  U('m4-mul', 4, '多位數乘除', ['做多位數乘法，先用個位乘，再用十位乘（記得補 0），最後相加。做除法可想「乘法倒轉」。'], ['p4-mul-multi', 'p4-div-multi'], p4mul),
  U('m5-decimal', 5, '小數乘除', ['小數乘法：先當整數乘，再數兩個因數共有幾位小數。小數除法：把除數變成整數（兩邊同乘 10、100…）再除。'], ['p5-decimal-mul', 'p5-decimal-div'], p5dec),
  U('m5-fraction', 5, '分數運算', ['異分母分數要先通分才可以加減。分數乘法：分子乘分子，分母乘分母，結果記得約簡。'], ['p5-fraction-unlike', 'p5-fraction-mul'], p5frac),
  U('m5-percent', 5, '百分數', ['百分數是分母為 100 的分數：35% = 35/100 = 0.35。求「某數的百分之幾」，用乘法。'], ['p5-percent', 'p5-percent-of'], p5pct),
  U('m5-average', 5, '平均數', ['平均數 = 總和 ÷ 個數。反過來，總和 = 平均數 × 個數。'], ['p5-average'], p5avg),
  U('m5-volume', 5, '體積', ['長方體體積 = 長 × 闊 × 高；正方體體積 = 邊長 × 邊長 × 邊長。單位是立方厘米。'], ['p5-volume'], p5vol),
  U('m6-ratio', 6, '比與比例', ['比可以像分數一樣約簡：6:9 = 2:3。按比分配時，先算出共有幾份，再求每份是多少。'], ['p6-ratio', 'p6-ratio-share'], p6ratio),
  U('m6-percent', 6, '百分數應用（折扣、加價）', ['減價 20% 即是售價為原價的 80%；加價 20% 即是售價為成本的 120%。打 8 折即是原價的 80%。'], ['p6-discount', 'p6-markup'], p6pct),
  U('m6-speed', 6, '速率', ['速率 = 路程 ÷ 時間；路程 = 速率 × 時間；時間 = 路程 ÷ 速率。留意單位要一致。'], ['p6-speed'], p6speed),
  U('m6-algebra', 6, '簡易方程', ['解方程要保持天秤平衡：兩邊做相同的運算。先把常數項移走，再除以 x 前面的數。'], ['p6-equation'], p6alg),
  U('m6-circle', 6, '圓周與圓面積', ['圓周 = 2 × π × 半徑 = π × 直徑；圓面積 = π × 半徑 × 半徑。本題庫取 π = 3.14。'], ['p6-circle'], p6circle),
  ...MX_UNITS,
];
