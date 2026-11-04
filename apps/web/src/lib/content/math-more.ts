import type { Unit, GenQuestion } from './types';
import type { Rng } from './rng';
import { dec, gcd, lcm, isPrime, frac, reduce, num, fractionQ, choice, staticChoice } from './helpers';

type G = (r: Rng) => GenQuestion;
const U = (id: string, grade: number, title: string, intro: string[], tags: string[], gens: G[]): Unit => ({ id, subject: 'math', grade, title, intro, tags, gens, source: 'builtin' });
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

// ───────── P1 ─────────
const p1order: G[] = [
  (r) => { const n = r.int(10, 98); return num(`${n} 的後一個數是多少？`, n + 1, 'p1-order', `${n} 再多 1 就是 ${n + 1}。`); },
  (r) => { const n = r.int(11, 99); return num(`${n} 的前一個數是多少？`, n - 1, 'p1-order', `${n} 少 1 就是 ${n - 1}。`); },
  (r) => { const a = r.int(10, 97); return num(`在 ${a} 和 ${a + 2} 之間的數是多少？`, a + 1, 'p1-order', `${a}、${a + 1}、${a + 2}，中間是 ${a + 1}。`); },
  (r) => { const xs = r.shuffle([...new Set(Array.from({ length: 6 }, () => r.int(10, 99)))]).slice(0, 3); if (xs.length < 3) return num('10 的後一個數是多少？', 11, 'p1-order'); return num(`${xs.join('、')}，哪一個數最大？`, Math.max(...xs), 'p1-order-max', '先比十位，十位大的數就大；十位相同再比個位。'); },
  (r) => { const xs = r.shuffle([...new Set(Array.from({ length: 6 }, () => r.int(10, 99)))]).slice(0, 3); if (xs.length < 3) return num('10 的後一個數是多少？', 11, 'p1-order'); return num(`${xs.join('、')}，哪一個數最小？`, Math.min(...xs), 'p1-order-max', '先比十位，十位小的數就小；十位相同再比個位。'); },
  (r) => { const s = r.int(2, 8) * 10, step = r.pick([2, 5, 10]); return num(`${s}、${s + step}、${s + 2 * step}、□，□ 是多少？`, s + 3 * step, 'p1-pattern', `每次加 ${step}，所以 ${s + 2 * step} 後面是 ${s + 3 * step}。`); },
];
const p1time: G[] = [
  (r) => { const h = r.int(1, 12); return num(`短針指向 ${h}，長針指向 12，現在是幾時正？`, h, 'p1-time', `長針指向 12 就是整點，短針指向 ${h} 就是 ${h} 時正。`, '時'); },
  (r) => { const h = r.int(1, 12); return num(`現在是 ${h} 時正，長針指向哪個數字？`, 12, 'p1-time', '整點時，長針指向 12。'); },
  (r) => { const h = r.int(1, 12); return num(`現在是 ${h} 時半，長針指向哪個數字？`, 6, 'p1-time', '半點（30 分）時，長針指向 6。'); },
  (r) => { const h = r.int(1, 10); return num(`現在是 ${h} 時正，1 小時後是幾時？`, h + 1, 'p1-time', `${h} + 1 = ${h + 1}`, '時'); },
];
const p1shapes: GenQuestion[] = [
  staticChoice('有 3 條邊的圖形是哪一個？', '三角形', ['圓形', '正方形', '長方形'], 'p1-shape', '三角形有 3 條邊和 3 個角。'),
  staticChoice('沒有角的圖形是哪一個？', '圓形', ['三角形', '正方形', '長方形'], 'p1-shape', '圓形是彎曲的，沒有角。'),
  staticChoice('有 4 條邊都一樣長的圖形是哪一個？', '正方形', ['三角形', '圓形', '長方形'], 'p1-shape', '正方形的 4 條邊一樣長；長方形只有對邊一樣長。'),
  staticChoice('骰子的形狀是哪一個？', '立方體', ['球體', '圓柱體', '圓錐體'], 'p1-solid', '骰子有 6 個正方形的面，是立方體。'),
  staticChoice('皮球的形狀是哪一個？', '球體', ['立方體', '圓柱體', '圓錐體'], 'p1-solid', '皮球四面都是圓圓的，是球體。'),
  staticChoice('罐頭（像一個筒）的形狀是哪一個？', '圓柱體', ['球體', '立方體', '圓錐體'], 'p1-solid', '罐頭上下都是圓形，旁邊是彎的面，是圓柱體。'),
  num('三角形有幾個角？', 3, 'p1-shape', '三角形有 3 個角。'),
  num('正方形有幾條邊？', 4, 'p1-shape', '正方形有 4 條邊。'),
  num('長方形有幾個角？', 4, 'p1-shape', '長方形有 4 個角。'),
  staticChoice('哪一樣東西最像長方形？', '課本的封面', ['乒乓球', '三角尺的面', '硬幣'], 'p1-shape', '課本的封面有 4 條邊、4 個直角，是長方形。'),
];

// ───────── P2 ─────────
const p2length: G[] = [
  (r) => { const a = r.int(1, 9); return num(`${a} 米 = □ 厘米`, a * 100, 'p2-length', `1 米 = 100 厘米，${a} × 100 = ${a * 100}。`, '厘米'); },
  (r) => { const a = r.int(1, 9); return num(`${a * 100} 厘米 = □ 米`, a, 'p2-length', `100 厘米 = 1 米。`, '米'); },
  (r) => { const a = r.int(8, 30), b = r.int(5, 25); return num(`鉛筆長 ${a} 厘米，橡皮擦長 ${b} 厘米，兩樣東西接起來共長多少厘米？`, a + b, 'p2-length', `${a} + ${b} = ${a + b}`, '厘米'); },
  (r) => { const a = r.int(40, 99), b = r.int(10, 39); return num(`一條繩長 ${a} 厘米，剪去 ${b} 厘米，還剩多少厘米？`, a - b, 'p2-length', `${a} − ${b} = ${a - b}`, '厘米'); },
];
const p2divide: G[] = [
  (r) => { const k = r.pick([2, 3, 4, 5]), q = r.int(2, 9); return num(`把 ${k * q} 粒糖平均分給 ${k} 個人，每人得多少粒？`, q, 'p2-divide', `${k * q} ÷ ${k} = ${q}，因為 ${k} × ${q} = ${k * q}。`, '粒'); },
  (r) => { const k = r.pick([2, 3, 4, 5, 10]), q = r.int(2, 9); return num(`${k * q} ÷ ${k} = ?`, q, 'p2-divide', `想：${k} × □ = ${k * q}。`); },
  (r) => { const k = r.pick([2, 3, 4, 5]), q = r.int(3, 9); return num(`有 ${k * q} 個蘋果，每 ${k} 個放進一個袋，可以放滿幾個袋？`, q, 'p2-divide', `${k * q} ÷ ${k} = ${q}`, '個'); },
];
const p2place: G[] = [
  (r) => { const n = r.int(101, 999); return num(`${n} 的百位數字是多少？`, Math.floor(n / 100), 'p2-place3', `${n} 的百位是 ${Math.floor(n / 100)}。`); },
  (r) => { const a = r.int(1, 9), b = r.int(0, 9), c = r.int(0, 9); return num(`${a} 個百、${b} 個十和 ${c} 個一合起來是多少？`, a * 100 + b * 10 + c, 'p2-place3', `${a * 100} + ${b * 10} + ${c} = ${a * 100 + b * 10 + c}`); },
  (r) => { const n = r.int(200, 889); return num(`比 ${n} 大 10 的數是多少？`, n + 10, 'p2-place3', `十位加 1：${n} + 10 = ${n + 10}。`); },
  (r) => { const n = r.int(300, 899); return num(`比 ${n} 小 100 的數是多少？`, n - 100, 'p2-place3', `百位減 1：${n} − 100 = ${n - 100}。`); },
];
const p2calendar: G[] = [
  () => num('一個星期有多少日？', 7, 'p2-calendar', '星期日至星期六，共 7 日。', '日'),
  () => num('一年有多少個月？', 12, 'p2-calendar', '一年有 12 個月。', '個月'),
  (r) => { const m = r.pick([1, 3, 5, 7, 8, 10, 12]); return num(`${m} 月有多少日？`, 31, 'p2-calendar', `${m} 月是大月，有 31 日。`, '日'); },
  (r) => { const m = r.pick([4, 6, 9, 11]); return num(`${m} 月有多少日？`, 30, 'p2-calendar', `${m} 月是小月，有 30 日。`, '日'); },
  (r) => { const d = r.int(0, 6), k = r.int(1, 6), ans = `星期${WEEK[(d + k) % 7]}`; return choice(r, `今日是星期${WEEK[d]}，${k} 日後是星期幾？`, ans, r.shuffle(WEEK.map((w) => `星期${w}`).filter((x) => x !== ans)), 'p2-calendar', `星期${WEEK[d]}之後數 ${k} 日，就是${ans}。`); },
];

// ───────── P3 ─────────
const p3time24: G[] = [
  (r) => { const a = r.int(6, 10), b = r.int(a + 2, 12); return num(`由上午 ${a} 時到中午 ${b} 時，經過了多少小時？`, b - a, 'p3-time24', `${b} − ${a} = ${b - a}`, '小時'); },
  (r) => { const p = r.int(1, 11); return num(`下午 ${p} 時，用 24 小時制寫是幾時？`, p + 12, 'p3-time24', `下午 ${p} 時 = ${p} + 12 = ${p + 12} 時。`, '時'); },
  (r) => { const h = r.int(13, 23); return num(`24 小時制的 ${h} 時，是下午幾時？`, h - 12, 'p3-time24', `${h} − 12 = ${h - 12}，即下午 ${h - 12} 時。`, '時'); },
  (r) => { const a = r.int(1, 6), d = r.int(2, 5); return num(`電影在下午 ${a} 時開始，放映 ${d} 小時。散場時是下午幾時？`, a + d, 'p3-time24', `${a} + ${d} = ${a + d}`, '時'); },
];
const p3measure: G[] = [
  (r) => { const a = r.int(2, 9); return num(`${a} 公里 = □ 米`, a * 1000, 'p3-measure', `1 公里 = 1000 米。`, '米'); },
  (r) => { const a = r.int(2, 9); return num(`${a} 千克 = □ 克`, a * 1000, 'p3-measure', `1 千克 = 1000 克。`, '克'); },
  (r) => { const a = r.int(1, 9), b = r.int(1, 99); return num(`${a} 米 ${b} 厘米 = □ 厘米`, a * 100 + b, 'p3-measure', `${a} 米 = ${a * 100} 厘米，再加 ${b} 厘米。`, '厘米'); },
  (r) => { const a = r.int(2, 9); return num(`${a * 1000} 克 = □ 千克`, a, 'p3-measure', '1000 克 = 1 千克。', '千克'); },
  (r) => { const a = r.int(2, 9); return num(`${a} 公升 = □ 毫升`, a * 1000, 'p3-measure', '1 公升 = 1000 毫升。', '毫升'); },
];
const p3angle: G[] = [
  (r) => { const x = r.pick([15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 120, 125, 135, 140, 150, 160, 170, 175]); const ans = x < 90 ? '銳角' : x === 90 ? '直角' : '鈍角'; return choice(r, `${x}° 的角是甚麼角？`, ans, ['銳角', '直角', '鈍角', '平角'].filter((v) => v !== ans), 'p3-angle', '小於 90° 是銳角；等於 90° 是直角；大於 90° 而小於 180° 是鈍角。'); },
  () => num('一個直角是多少度？', 90, 'p3-angle', '直角是 90°。', '度'),
  (r) => { const a = r.pick(['銳角', '鈍角']); return choice(r, `比直角${a === '銳角' ? '小' : '大'}的角（小於 180°）叫甚麼角？`, a, ['銳角', '直角', '鈍角', '平角'].filter((v) => v !== a), 'p3-angle'); },
];
const p3data: G[] = [
  (r) => { const items = r.shuffle(['蘋果', '香蕉', '橙', '西瓜', '提子']).slice(0, 3); const ns = r.shuffle([3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3); const t = items.map((x, i) => `${x} ${ns[i]} 人`).join('、'); const mx = ns.indexOf(Math.max(...ns)); return choice(r, `全班同學最喜歡的水果：${t}。哪種水果最多人喜歡？`, items[mx], items.filter((_, i) => i !== mx), 'p3-data', '比較各個數字，找出最大的。'); },
  (r) => { const items = r.shuffle(['足球', '籃球', '羽毛球', '游泳']).slice(0, 3); const ns = r.shuffle([4, 5, 6, 7, 8, 9, 12]).slice(0, 3); const t = items.map((x, i) => `${x} ${ns[i]} 人`).join('、'); return num(`喜歡運動的人數：${t}。一共有多少人？`, ns[0] + ns[1] + ns[2], 'p3-data', `${ns.join(' + ')} = ${ns[0] + ns[1] + ns[2]}`, '人'); },
  (r) => { const ns = r.shuffle([3, 4, 5, 6, 7, 8, 9, 10, 12]).slice(0, 2).sort((a, b) => b - a); return num(`班上喜歡畫畫的有 ${ns[0]} 人，喜歡唱歌的有 ${ns[1]} 人。喜歡畫畫的比喜歡唱歌的多多少人？`, ns[0] - ns[1], 'p3-data', `${ns[0]} − ${ns[1]} = ${ns[0] - ns[1]}`, '人'); },
];

// ───────── P4 ─────────
const p4factor: G[] = [
  (r) => { const n = r.pick([12, 16, 18, 20, 24, 28, 30, 36, 40, 42, 48]); let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return num(`${n} 有多少個因數？`, c, 'p4-factor', `把 ${n} 的因數逐個找出來（成對找）：${Array.from({ length: n }, (_, i) => i + 1).filter((i) => n % i === 0).join('、')}。`, '個'); },
  (r) => { const n = r.int(11, 60); const p = isPrime(n); return choice(r, `${n} 是質數還是合數？`, p ? '質數' : '合數', [p ? '合數' : '質數'], 'p4-prime', p ? `${n} 只有 1 和它自己兩個因數，是質數。` : `${n} 除了 1 和它自己，還有其他因數，是合數。`); },
  (r) => { const a = r.int(3, 9); return num(`${a} 的倍數中，最小的三位數是多少？`, Math.ceil(100 / a) * a, 'p4-multiple', `${Math.ceil(100 / a)} × ${a} = ${Math.ceil(100 / a) * a}`); },
  (r) => { const k = r.int(3, 9), n = r.int(30, 99); return num(`1 至 ${n}（包括 ${n}）中，${k} 的倍數有多少個？`, Math.floor(n / k), 'p4-multiple', `${n} ÷ ${k} 的商是 ${Math.floor(n / k)}，所以有 ${Math.floor(n / k)} 個。`, '個'); },
];
const p4angles: G[] = [
  (r) => { const x = r.int(20, 160); return num(`直線上有兩個角，其中一個是 ${x}°，另一個是多少度？`, 180 - x, 'p4-angle-calc', `直線上的角加起來是 180°：180 − ${x} = ${180 - x}。`, '度'); },
  (r) => { const a = r.int(30, 90), b = r.int(30, 90); if (a + b >= 165) return num('三角形兩個角是 60° 和 70°，第三個角是多少度？', 50, 'p4-angle-calc', '180 − 60 − 70 = 50', '度'); return num(`三角形的兩個角分別是 ${a}° 和 ${b}°，第三個角是多少度？`, 180 - a - b, 'p4-angle-calc', `三角形內角和是 180°：180 − ${a} − ${b} = ${180 - a - b}。`, '度'); },
  (r) => { const x = r.pick([30, 40, 45, 50, 60, 70]); return num(`一個直角分成兩個角，其中一個是 ${x}°，另一個是多少度？`, 90 - x, 'p4-angle-calc', `直角是 90°：90 − ${x} = ${90 - x}。`, '度'); },
];
const roundTo = (n: number, p: number) => Math.floor((n + p / 2) / p) * p;
const p4round: G[] = [
  (r) => { const n = r.int(1000, 99999); const p = r.pick([10, 100, 1000]); return num(`把 ${n} 四捨五入至最接近的${{ 10: '十', 100: '百', 1000: '千' }[p]}位，是多少？`, roundTo(n, p), 'p4-round', `看下一位：5 或以上就進 1，4 或以下就捨去。`); },
  (r) => { const n = r.int(120, 9990); const p = r.pick([10, 100]); return num(`${n} 約等於多少？（四捨五入至${p === 10 ? '十' : '百'}位）`, roundTo(n, p), 'p4-round', '看被捨去那一位：5 或以上進一，4 或以下捨去。'); },
];
const DIG = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const p4bignum: G[] = [
  (r) => { const d = Array.from({ length: 5 }, () => r.int(1, 9)); const s = `${DIG[d[0]]}萬${DIG[d[1]]}千${DIG[d[2]]}百${DIG[d[3]]}十${DIG[d[4]]}`; return num(`「${s}」用數字寫是多少？`, d.join(''), 'p4-bignum', `${d[0]} 萬 ${d[1]} 千 ${d[2]} 百 ${d[3]} 十 ${d[4]}，即 ${d.join('')}。`); },
  (r) => { const n = r.int(10000, 99999); const pos = r.pick([['萬位', 0], ['千位', 1], ['百位', 2], ['十位', 3], ['個位', 4]] as const); return num(`${n} 的${pos[0]}數字是多少？`, String(n)[pos[1]], 'p4-bignum', `從左到右依次是萬位、千位、百位、十位、個位。`); },
  (r) => { const n = r.int(10000, 98000); return num(`比 ${n} 大 1000 的數是多少？`, n + 1000, 'p4-bignum', `千位加 1：${n} + 1000 = ${n + 1000}。`); },
];

// ───────── P5 ─────────
const pairs: [number, number][] = [[12, 18], [8, 12], [6, 15], [9, 12], [10, 25], [14, 21], [16, 24], [18, 24], [20, 30], [15, 20], [12, 20], [8, 10], [6, 8], [24, 36], [21, 28], [18, 27]];
const p5hcf: G[] = [
  (r) => { const [a, b] = r.pick(pairs); return num(`${a} 和 ${b} 的最大公因數（H.C.F.）是多少？`, gcd(a, b), 'p5-hcf', `${a} 的因數與 ${b} 的因數中，最大的共同因數是 ${gcd(a, b)}。`); },
  (r) => { const [a, b] = r.pick(pairs); return num(`${a} 和 ${b} 的最小公倍數（L.C.M.）是多少？`, lcm(a, b), 'p5-lcm', `${a} 與 ${b} 的公倍數中，最小的是 ${lcm(a, b)}。`); },
  (r) => { const a = r.pick([4, 6, 8, 9, 10, 12]), b = r.pick([5, 6, 9, 10, 15]); if (a === b) return num('4 和 6 的最小公倍數是多少？', 12, 'p5-lcm'); return num(`巴士甲每 ${a} 分鐘一班，巴士乙每 ${b} 分鐘一班，兩輛巴士同時開出後，最少要過多少分鐘才會再次同時開出？`, lcm(a, b), 'p5-lcm', `求 ${a} 和 ${b} 的最小公倍數 = ${lcm(a, b)}。`, '分鐘'); },
];
const p5area: G[] = [
  (r) => { const b = r.int(2, 12) * 2, h = r.int(3, 12); return num(`三角形的底是 ${b} 厘米，高是 ${h} 厘米，面積是多少平方厘米？`, (b * h) / 2, 'p5-area-triangle', `三角形面積 = 底 × 高 ÷ 2 = ${b} × ${h} ÷ 2 = ${(b * h) / 2}`, '平方厘米'); },
  (r) => { const b = r.int(4, 15), h = r.int(3, 12); return num(`平行四邊形的底是 ${b} 厘米，高是 ${h} 厘米，面積是多少平方厘米？`, b * h, 'p5-area-parallelogram', `平行四邊形面積 = 底 × 高 = ${b} × ${h}`, '平方厘米'); },
  (r) => { const a = r.int(3, 9), b = r.int(a + 1, 14), h = r.int(2, 10); const t = (a + b) * h; if (t % 2) return num('梯形的上底 4 厘米、下底 8 厘米、高 5 厘米，面積是多少平方厘米？', 30, 'p5-area-trapezium', '(4 + 8) × 5 ÷ 2 = 30', '平方厘米'); return num(`梯形的上底是 ${a} 厘米，下底是 ${b} 厘米，高是 ${h} 厘米，面積是多少平方厘米？`, t / 2, 'p5-area-trapezium', `梯形面積 = (上底 + 下底) × 高 ÷ 2 = (${a} + ${b}) × ${h} ÷ 2 = ${t / 2}`, '平方厘米'); },
];
const p5quad: G[] = [
  (r) => { const a = r.int(60, 120), b = r.int(60, 120), c = r.int(60, 120), d = 360 - a - b - c; if (d < 40 || d > 140) return num('四邊形三個內角是 90°、80° 和 100°，第四個角是多少度？', 90, 'p5-quad-angle', '360 − 90 − 80 − 100 = 90', '度'); return num(`四邊形的三個內角分別是 ${a}°、${b}° 和 ${c}°，第四個內角是多少度？`, d, 'p5-quad-angle', `四邊形的內角和是 360°：360 − ${a} − ${b} − ${c} = ${d}。`, '度'); },
  () => num('四邊形的內角和是多少度？', 360, 'p5-quad-angle', '四邊形可以分成 2 個三角形，2 × 180° = 360°。', '度'),
];
const p5dconv: G[] = [
  (r) => { const q = r.pick([2, 4, 5, 8, 10, 20, 25]), p = r.int(1, q - 1); const places = 3; return num(`把 ${frac(p, q)} 化成小數。`, dec(p * (1000 / q), places), 'p5-frac-decimal', `${p} ÷ ${q} = ${dec(p * (1000 / q), places)}`); },
  (r) => { const x = r.pick([5, 10, 15, 20, 25, 35, 40, 45, 55, 60, 65, 75, 80, 85]); const [n, d] = reduce(x, 100); return fractionQ(`把 0.${String(x).padStart(2, '0')} 化成最簡分數。`, frac(n, d), 'p5-decimal-frac', `0.${String(x).padStart(2, '0')} = ${x}/100，再約簡。`); },
];

// ───────── P6 ─────────
const p6change: G[] = [
  (r) => { const a = r.pick([20, 40, 50, 80, 100, 200]), p = r.pick([10, 20, 25, 50]); return num(`某物品價錢由 $${a} 增加到 $${(a * (100 + p)) / 100}，增加了百分之幾？（只填數字）`, p, 'p6-pct-change', `增加了 ${(a * p) / 100} 元，${(a * p) / 100} ÷ ${a} = ${p}%。`, '%'); },
  (r) => { const a = r.pick([20, 40, 50, 80, 100, 200]), p = r.pick([10, 20, 25, 50]); return num(`某物品價錢由 $${a} 減少到 $${(a * (100 - p)) / 100}，減少了百分之幾？（只填數字）`, p, 'p6-pct-change', `減少了 ${(a * p) / 100} 元，${(a * p) / 100} ÷ ${a} = ${p}%。`, '%'); },
  (r) => { const a = r.pick([100, 200, 400, 500]), p = r.pick([10, 20, 25, 50]); return num(`學校去年有 ${a} 位學生，今年增加了 ${p}%，今年有多少位學生？`, (a * (100 + p)) / 100, 'p6-pct-change', `今年 = 去年 × (100 + ${p})% = ${a} × ${100 + p}%`, '位'); },
];
const p6interest: G[] = [
  (r) => { const P = r.pick([1000, 2000, 5000, 10000]), rate = r.pick([1, 2, 3, 4, 5]), t = r.int(1, 5); return num(`本金 $${P}，年利率 ${rate}%，存 ${t} 年（單利息），利息是多少元？`, (P * rate * t) / 100, 'p6-interest', `利息 = 本金 × 年利率 × 年數 = ${P} × ${rate}% × ${t} = ${(P * rate * t) / 100}`, '元'); },
  (r) => { const P = r.pick([1000, 2000, 5000, 10000]), rate = r.pick([1, 2, 3, 4, 5]), t = r.int(1, 4); return num(`本金 $${P}，年利率 ${rate}%，存 ${t} 年（單利息），本利和是多少元？`, P + (P * rate * t) / 100, 'p6-interest', `本利和 = 本金 + 利息 = ${P} + ${(P * rate * t) / 100}`, '元'); },
];
const p6scale: G[] = [
  (r) => { const sc = r.pick([100, 500, 1000, 5000, 10000]), c = r.int(2, 12); return num(`地圖的比例尺是 1：${sc}，圖上 ${c} 厘米代表實際多少米？`, (c * sc) / 100, 'p6-scale', `實際距離 = ${c} × ${sc} = ${c * sc} 厘米 = ${(c * sc) / 100} 米。`, '米'); },
  (r) => { const sc = r.pick([100, 500, 1000, 5000]), c = r.int(2, 12); return num(`比例尺是 1：${sc}，實際距離是 ${(c * sc) / 100} 米，圖上應畫多少厘米？`, c, 'p6-scale', `${(c * sc) / 100} 米 = ${c * sc} 厘米，除以 ${sc} 得 ${c}。`, '厘米'); },
];
const p6fdiv: G[] = [
  (r) => { const a = r.int(1, 5), b = r.int(a + 1, 7), c = r.int(1, 5), d = r.int(c + 1, 7); const [n, dd] = reduce(a * d, b * c); return fractionQ(`${frac(a, b)} ÷ ${frac(c, d)} = ?（最簡分數）`, frac(n, dd), 'p6-fraction-div', `除以一個分數，等於乘它的倒數：${frac(a, b)} × ${frac(d, c)}。`); },
  (r) => { const a = r.int(1, 5), b = r.int(a + 1, 8), k = r.int(2, 6); const [n, d] = reduce(a, b * k); return fractionQ(`${frac(a, b)} ÷ ${k} = ?（最簡分數）`, frac(n, d), 'p6-fraction-div', `除以 ${k} 等於乘 1/${k}：${frac(a, b)} × ${frac(1, k)}。`); },
];
const p6pattern: G[] = [
  (r) => { const a = r.int(2, 12), d = r.int(2, 9); return num(`${a}、${a + d}、${a + 2 * d}、${a + 3 * d}、□，□ 是多少？`, a + 4 * d, 'p6-pattern', `每項比前一項多 ${d}。`); },
  (r) => { const a = r.int(2, 12), d = r.int(2, 9), n = r.int(8, 20); return num(`數列 ${a}、${a + d}、${a + 2 * d}、${a + 3 * d}、…，第 ${n} 項是多少？`, a + (n - 1) * d, 'p6-pattern', `第 n 項 = ${a} + (n − 1) × ${d}，第 ${n} 項 = ${a} + ${n - 1} × ${d} = ${a + (n - 1) * d}。`); },
  (r) => { const a = r.int(1, 5), k = r.pick([2, 3]); return num(`${a}、${a * k}、${a * k ** 2}、${a * k ** 3}、□，□ 是多少？`, a * k ** 4, 'p6-pattern', `每項是前一項的 ${k} 倍。`); },
];

export const MORE_MATH_UNITS: Unit[] = [
  U('m1-order', 1, '數的順序與比較', ['前一個數比它少 1，後一個數比它多 1。比較三個數的大小，先比十位。'], ['p1-order', 'p1-order-max', 'p1-pattern'], p1order),
  U('m1-time', 1, '認識時鐘（整點與半點）', ['短針表示「時」，長針表示「分」。長針指向 12 是整點；指向 6 是半點。'], ['p1-time'], p1time),
  { ...U('m1-shapes', 1, '認識圖形與立體', ['三角形有 3 條邊；正方形的 4 條邊一樣長；長方形的對邊一樣長；圓形沒有角。'], ['p1-shape', 'p1-solid'], []), gens: undefined, bank: p1shapes },
  U('m2-length', 2, '長度（厘米與米）', ['1 米 = 100 厘米。量長度要從 0 開始量。'], ['p2-length'], p2length),
  U('m2-divide', 2, '除法入門（平均分）', ['平均分就是每份一樣多。除法是乘法倒轉：6 ÷ 2 = 3，因為 2 × 3 = 6。'], ['p2-divide'], p2divide),
  U('m2-place3', 2, '三位數', ['三位數由百位、十位和個位組成：352 = 3 個百 + 5 個十 + 2 個一。'], ['p2-place3'], p2place),
  U('m2-calendar', 2, '日曆與星期', ['一星期有 7 日，一年有 12 個月。大月 31 日，小月 30 日。'], ['p2-calendar'], p2calendar),
  U('m3-time24', 3, '24 小時制與經過的時間', ['下午的時間加 12 就是 24 小時制：下午 3 時 = 15 時。計算經過的時間，用較遲的時間減較早的時間。'], ['p3-time24'], p3time24),
  U('m3-measure', 3, '長度、重量與容量換算', ['1 公里 = 1000 米；1 米 = 100 厘米；1 千克 = 1000 克；1 公升 = 1000 毫升。'], ['p3-measure'], p3measure),
  U('m3-angle', 3, '認識角', ['直角是 90°；比直角小的是銳角；比直角大而小於 180° 的是鈍角。'], ['p3-angle'], p3angle),
  U('m3-data', 3, '統計表與數據', ['看統計表要先看清楚項目和人數；找最多就是比較數字大小；求「一共」就用加法，求「多多少」就用減法。'], ['p3-data'], p3data),
  U('m4-factor', 4, '因數、倍數、質數與合數', ['能整除某數的數叫它的因數；質數只有 1 和自己兩個因數；合數有三個或以上的因數。1 既不是質數也不是合數。'], ['p4-factor', 'p4-prime', 'p4-multiple'], p4factor),
  U('m4-angles', 4, '角的計算', ['直線上的角加起來是 180°；三角形的三個內角加起來是 180°；直角是 90°。'], ['p4-angle-calc'], p4angles),
  U('m4-round', 4, '四捨五入', ['要約至哪一位，就看它的下一位：5 或以上就進 1，4 或以下就捨去，然後後面的位都變成 0。'], ['p4-round'], p4round),
  U('m4-bignum', 4, '五位數的讀寫', ['五位數的數位由左至右是：萬位、千位、百位、十位、個位。'], ['p4-bignum'], p4bignum),
  U('m5-hcf-lcm', 5, '最大公因數與最小公倍數', ['H.C.F. 是兩個數共有的因數中最大的；L.C.M. 是兩個數共有的倍數中最小的。'], ['p5-hcf', 'p5-lcm'], p5hcf),
  U('m5-area', 5, '三角形、平行四邊形和梯形的面積', ['三角形面積 = 底 × 高 ÷ 2；平行四邊形面積 = 底 × 高；梯形面積 = (上底 + 下底) × 高 ÷ 2。高要和底成直角。'], ['p5-area-triangle', 'p5-area-parallelogram', 'p5-area-trapezium'], p5area),
  U('m5-quad', 5, '四邊形的內角', ['四邊形可以分成 2 個三角形，所以內角和是 360°。'], ['p5-quad-angle'], p5quad),
  U('m5-conv', 5, '分數與小數互化', ['分數化小數：分子 ÷ 分母。小數化分數：寫成分母是 10、100 的分數，再約簡。'], ['p5-frac-decimal', 'p5-decimal-frac'], p5dconv),
  U('m6-pct-change', 6, '百分數增減', ['增加（減少）百分率 = 增加（減少）的量 ÷ 原來的量 × 100%。'], ['p6-pct-change'], p6change),
  U('m6-interest', 6, '利息（單利息）', ['單利息：利息 = 本金 × 年利率 × 年數。本利和 = 本金 + 利息。'], ['p6-interest'], p6interest),
  U('m6-scale', 6, '比例尺', ['比例尺 1：1000 表示圖上 1 厘米代表實際 1000 厘米（10 米）。換算時要留意單位。'], ['p6-scale'], p6scale),
  U('m6-fdiv', 6, '分數除法', ['除以一個分數，等於乘它的倒數；計算後記得約簡。'], ['p6-fraction-div'], p6fdiv),
  U('m6-pattern', 6, '數列與規律', ['等差數列每項增加同一個數：第 n 項 = 首項 + (n − 1) × 公差。'], ['p6-pattern'], p6pattern),
];
