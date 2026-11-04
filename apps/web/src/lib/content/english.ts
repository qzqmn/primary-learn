import type { Unit, GenQuestion } from './types';
import type { Rng } from './rng';
import { choice, staticChoice, textQ } from './helpers';
import * as D from './english-data';
import type { W, V } from './english-data';

type G = (r: Rng) => GenQuestion;
const U = (id: string, grade: number, title: string, intro: string[], tags: string[], gens: G[]): Unit => ({ id, subject: 'english', grade, title, intro, tags, gens, source: 'builtin' });
const uniq = <T,>(a: T[]) => [...new Set(a)];

// ───────── 詞彙 ─────────
function vocab(pool: W[], more: W[], tag: string, spelling = true): G[] {
  const all = [...pool, ...more];
  const gens: G[] = [
    (r) => { const [en, zh] = r.pick(pool); return choice(r, `「${en}」是甚麼意思？`, zh, r.shuffle(all.filter((w) => w[1] !== zh)).slice(0, 3).map((w) => w[1]), tag, `${en} = ${zh}`); },
    (r) => { const [en, zh] = r.pick(pool); return choice(r, `哪一個英文字的意思是「${zh}」？`, en, r.shuffle(all.filter((w) => w[0] !== en)).slice(0, 3).map((w) => w[0]), tag, `${zh} 的英文是 ${en}。`); },
  ];
  const single = pool.filter((w) => !/[ \-]/.test(w[0]) && w[0].length >= 3);
  if (spelling && single.length) {
    gens.push((r) => { const [en, zh] = r.pick(single); return textQ(`請拼出「${zh}」的英文：${en[0]}${'＿'.repeat(en.length - 1)}（共 ${en.length} 個字母）`, en, `${tag}-spell`, `${zh} 的英文是 ${en}。`); });
  }
  return gens;
}

// ───────── 動詞時態 ─────────
const S3 = ['He', 'She', 'Tom', 'My mother', 'The teacher', 'My brother'];
const SP = ['I', 'We', 'They', 'You', 'My friends', 'The boys'];
const beOf = (s: string) => (s === 'I' ? 'am' : S3.includes(s) ? 'is' : 'are');
const NOT_DAILY = new Set(['win', 'lose', 'break', 'forget', 'throw', 'send', 'spend', 'build', 'find', 'sell']);
const DAILY = D.VERBS.filter((x) => !NOT_DAILY.has(x.base));
const ACTION = DAILY.filter((x) => !x.stative);
const naiveEd = (b: string) => (b.endsWith('e') ? b + 'd' : b + 'ed');
const thirdForm = (s: string, x: V) => (S3.includes(s) ? x.s : x.base);

const presentSimple: G[] = [
  (r) => { const x = r.pick(DAILY), s = r.pick([...S3, ...SP]); const m = r.pick(['every day', 'every morning', 'on Sundays', 'after school']); const ans = thirdForm(s, x); return choice(r, `${s} ___ ${x.tail} ${m}. (${x.base})`, ans, [S3.includes(s) ? x.base : x.s, x.ing, x.past], 'e-present-simple', `${s} 是${S3.includes(s) ? '第三身單數，動詞要加 -s／-es' : '複數或 I／You，動詞用原形'}：${ans}。`); },
  (r) => { const x = r.pick(DAILY), p = r.pick(['he', 'she', 'it', 'you', 'we', 'they', 'I']); const ans = ['he', 'she', 'it'].includes(p) ? 'Does' : 'Do'; return choice(r, `___ ${p} ${x.base} ${x.tail}?`, ans, ['Do', 'Does', 'Is', 'Are'].filter((o) => o !== ans), 'e-present-simple-q', `he／she／it 用 Does，其他用 Do。`); },
  (r) => { const x = r.pick(DAILY), s = r.pick([...S3, ...SP]); const aux = S3.includes(s) ? "doesn't" : "don't"; return choice(r, `${s} ${aux} ___ ${x.tail}. (${x.base})`, x.base, [x.s, x.ing, x.past].filter((o) => o !== x.base), 'e-present-simple-neg', `${aux} 後面的動詞用原形：${x.base}。`); },
];
const presentCont: G[] = [
  (r) => { const x = r.pick(ACTION), s = r.pick([...S3, ...SP]); return choice(r, `Look! ${s} ${beOf(s)} ___ ${x.tail}. (${x.base})`, x.ing, [x.base, x.s, x.past].filter((o) => o !== x.ing), 'e-present-continuous', `am／is／are 後面的動詞用 -ing 形式：${x.ing}。`); },
  (r) => { const x = r.pick(ACTION), s = r.pick([...S3, ...SP]); const ans = beOf(s); return choice(r, `${s} ___ ${x.ing} ${x.tail} now.`, ans, ['am', 'is', 'are', 'be'].filter((o) => o !== ans), 'e-be-ing', `I 用 am；he／she／單數用 is；you／we／they／眾數用 are。`); },
  (r) => { const x = r.pick(D.VERBS); return textQ(`「${x.base}」加 -ing 要寫成甚麼？`, x.ing, 'e-ing-spelling', `${x.base} → ${x.ing}`); },
];
const IRR = D.VERBS.filter((x) => x.irregular);
const pastGens: G[] = [
  (r) => { const x = r.pick(IRR), s = r.pick([...S3, ...SP]); const m = r.pick(['Yesterday', 'Last night', 'Last week', 'Two days ago', 'Last Sunday']); return choice(r, `${m}, ${s} ___ ${x.tail}. (${x.base})`, x.past, [x.base, naiveEd(x.base), x.ing].filter((o) => o !== x.past), 'e-irregular-past', `${x.base} 是不規則動詞，過去式是 ${x.past}。`); },
  (r) => { const x = r.pick(IRR); return textQ(`「${x.base}」（${x.zh}）的過去式是甚麼？`, x.past, 'e-irregular-past', `${x.base} → ${x.past}`); },
  (r) => { const x = r.pick(IRR); return choice(r, `「${x.past}」是哪個動詞的過去式？`, x.base, r.shuffle(IRR.filter((y) => y.base !== x.base)).slice(0, 3).map((y) => y.base), 'e-irregular-past', `${x.base} → ${x.past}`); },
  (r) => { const x = r.pick(D.VERBS.filter((y) => !y.irregular)), s = r.pick([...S3, ...SP]); const m = r.pick(['Yesterday', 'Last week', 'Two days ago']); return choice(r, `${m}, ${s} ___ ${x.tail}. (${x.base})`, x.past, [x.base, x.ing, x.s].filter((o) => o !== x.past), 'e-regular-past', `規則動詞的過去式加 -ed（或 -d／變 y 為 ied）：${x.past}。`); },
];
const tenses: G[] = [
  (r) => { const x = r.pick(ACTION), s = r.pick([...S3, ...SP]); const m = r.pick(['every day', 'every morning', 'on Sundays']); const ans = thirdForm(s, x); return choice(r, `${s} ___ ${x.tail} ${m}.`, ans, [x.past, `will ${x.base}`, S3.includes(s) ? x.base : x.s], 'e-tense-mix', `${m} 表示習慣，用一般現在式：${ans}。`); },
  (r) => { const x = r.pick(ACTION), s = r.pick([...S3, ...SP]); const ans = `${beOf(s)} ${x.ing}`; return choice(r, `Look! ${s} ___ ${x.tail}.`, ans, [thirdForm(s, x), x.past, `will ${x.base}`], 'e-tense-mix', `Look! 表示正在發生，用現在進行式：${ans}。`); },
  (r) => { const x = r.pick(ACTION), s = r.pick([...S3, ...SP]); const m = r.pick(['Yesterday', 'Last week', 'Two days ago']); return choice(r, `${m}, ${s} ___ ${x.tail}.`, x.past, [thirdForm(s, x), `${beOf(s)} ${x.ing}`, `will ${x.base}`], 'e-tense-mix', `${m} 表示過去，用過去式：${x.past}。`); },
  (r) => { const x = r.pick(ACTION), s = r.pick(S3); const m = r.pick(['Tomorrow', 'Next week', 'Next Sunday']); const ans = `will ${x.base}`; return choice(r, `${m}, ${s} ___ ${x.tail}.`, ans, [x.past, x.ing, x.base], 'e-tense-mix', `${m} 表示將來，用 will + 動詞原形：${ans}。`); },
];

// ───────── 其他語法 ─────────
const PL = D.PLURALS.filter((p) => p.s !== 'fish');
const plurals: G[] = [
  (r) => { const p = r.pick(PL); const cands = uniq([p.s + 's', p.s + 'es', p.s.replace(/y$/, 'ies'), p.s.replace(/fe?$/, 'ves'), p.s + 'en', p.s]).filter((c) => c !== p.p && (c !== p.s || p.s !== p.p)); return choice(r, `「${p.s}」的眾數是甚麼？`, p.p, r.shuffle(cands), 'e-plural', p.rule); },
  (r) => { const p = r.pick(PL); return textQ(`請寫出「${p.s}」的眾數。`, p.p, 'e-plural', p.rule); },
];
const articles: G[] = [
  (r) => { const x = r.pick(D.A_AN); return choice(r, `This is ___ ${x.w}.`, x.art, ['a', 'an'].filter((o) => o !== x.art), 'e-a-an', x.why ?? (x.art === 'an' ? `${x.w} 以元音（a, e, i, o, u）的發音開頭，用 an。` : `${x.w} 以輔音的發音開頭，用 a。`)); },
];
const opposites: G[] = [
  (r) => { const [x, y] = r.pick(D.OPPOSITES); const [q, ans] = r.next() < 0.5 ? [x, y] : [y, x]; const others = D.OPPOSITES.filter((p) => p[0] !== x).flat().filter((w) => w !== q && w !== ans); return choice(r, `「${q}」的相反詞是甚麼？`, ans, r.shuffle(others).slice(0, 3), 'e-opposite', `${q} ↔ ${ans}`); },
];
const tens = [20, 30, 40, 50, 60, 70, 80, 90];
const numberWord = (n: number) => (n <= 20 ? D.NUM_WORDS[n] : n % 10 === 0 ? D.TENS[n] : `${D.TENS[n - (n % 10)]}-${D.NUM_WORDS[n % 10]}`);
const numbers: G[] = [
  (r) => { const n = r.int(0, 20); return textQ(`數字 ${n} 的英文怎樣寫？`, D.NUM_WORDS[n], 'e-number-words', `${n} = ${D.NUM_WORDS[n]}`); },
  (r) => { const n = r.int(21, 99); const w = numberWord(n); return textQ(`數字 ${n} 的英文怎樣寫？（兩位數中間加「-」）`, w, 'e-number-words', `${n} = ${w}`, [w.replace('-', ''), w.replace('-', ' ')]); },
  (r) => { const t = r.pick(tens); return textQ(`數字 ${t} 的英文怎樣寫？`, D.TENS[t], 'e-number-words', `${t} = ${D.TENS[t]}（留意 forty 沒有 u）`); },
  (r) => { const n = r.int(13, 19); const teen = D.NUM_WORDS[n], ty = n * 10 - (n - 13) * 0; const tyN = (n - 10) * 10; void ty; return choice(r, `「${teen}」是多少？`, String(n), [String(tyN), String(n + 1 > 19 ? n - 1 : n + 1), String(n - 1 < 13 ? n + 2 : n - 1)], 'e-teen-ty', `-teen 結尾是 13 至 19；-ty 結尾是 30、40…（thirteen = 13，thirty = 30）。`); },
  (r) => { const n = r.int(1, 12); return choice(r, `「${D.ORDINALS[n]}」是第幾個？`, `第 ${n} 個`, r.shuffle([...Array(12).keys()].map((i) => i + 1).filter((i) => i !== n)).slice(0, 3).map((i) => `第 ${i} 個`), 'e-ordinal', `${n} → ${D.ORDINALS[n]}`); },
  (r) => { const n = r.int(1, 12); return textQ(`「第 ${n} 個」用英文怎樣寫？`, D.ORDINALS[n], 'e-ordinal', `第 ${n} 個 = ${D.ORDINALS[n]}`); },
];
const dates: G[] = [
  (r) => { const i = r.int(0, 10); return choice(r, `${D.MONTHS[i]} 之後的一個月是哪個月？`, D.MONTHS[i + 1], r.shuffle(D.MONTHS.filter((m) => m !== D.MONTHS[i + 1] && m !== D.MONTHS[i])).slice(0, 3), 'e-months', `${D.MONTHS[i]} 之後是 ${D.MONTHS[i + 1]}。`); },
  (r) => { const i = r.int(0, 11); return choice(r, `哪一個月是一年的第 ${i + 1} 個月？`, D.MONTHS[i], r.shuffle(D.MONTHS.filter((m) => m !== D.MONTHS[i])).slice(0, 3), 'e-months', `第 ${i + 1} 個月是 ${D.MONTHS[i]}。`); },
  (r) => { const i = r.int(0, 5); return choice(r, `${D.DAYS[i]} 之後的一日是星期幾？`, D.DAYS[i + 1], r.shuffle(D.DAYS.filter((m) => m !== D.DAYS[i + 1] && m !== D.DAYS[i])).slice(0, 3), 'e-days', `${D.DAYS[i]} 之後是 ${D.DAYS[i + 1]}。`); },
  (r) => { const i = r.int(0, 6); return textQ(`請拼出「${['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][i]}」的英文：${D.DAYS[i][0]}${'＿'.repeat(D.DAYS[i].length - 1)}`, D.DAYS[i], 'e-days', `${D.DAYS[i]}（星期和月份的第一個字母都要大寫）`); },
];

const MIN_WORD: Record<number, string> = { 5: 'five', 10: 'ten', 20: 'twenty', 25: 'twenty-five' };
function clockPhrase(h: number, m: number): string {
  const H = (x: number) => D.NUM_WORDS[((x - 1) % 12) + 1];
  if (m === 0) return `${H(h)} o'clock`;
  if (m === 15) return `a quarter past ${H(h)}`;
  if (m === 30) return `half past ${H(h)}`;
  if (m === 45) return `a quarter to ${H(h + 1)}`;
  return m < 30 ? `${MIN_WORD[m]} past ${H(h)}` : `${MIN_WORD[60 - m]} to ${H(h + 1)}`;
}
const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const clock: G[] = [
  (r) => { const h = r.int(1, 12), m = r.pick(MINS); const ans = clockPhrase(h, m); const wrong = uniq([clockPhrase(h, r.pick(MINS.filter((x) => x !== m))), clockPhrase(((h % 12) + 1), m), clockPhrase(h === 1 ? 12 : h - 1, m), clockPhrase(h, r.pick(MINS.filter((x) => x !== m)))]).filter((w) => w !== ans); return choice(r, `${h}:${String(m).padStart(2, '0')} 用英文怎樣說？`, ans, wrong, 'e-clock', `${h}:${String(m).padStart(2, '0')} = ${ans}`); },
  (r) => { const h = r.int(1, 12), m = r.pick(MINS); const ans = `${h}:${String(m).padStart(2, '0')}`; const wrong = uniq([`${h}:${String(r.pick(MINS.filter((x) => x !== m))).padStart(2, '0')}`, `${(h % 12) + 1}:${String(m).padStart(2, '0')}`, `${h === 1 ? 12 : h - 1}:${String(m).padStart(2, '0')}`]).filter((w) => w !== ans); return choice(r, `"${clockPhrase(h, m)}" 是幾點？`, ans, wrong, 'e-clock', `${clockPhrase(h, m)} = ${ans}`); },
];
const compar: G[] = [
  (r) => { const x = r.pick(D.ADJ), [A, B] = r.shuffle(['Tom', 'Ben', 'Amy', 'Mary', 'Peter', 'Sue']); const subj = x.kind === 'person' ? `${A} is` : 'This bag is', other = x.kind === 'person' ? B : 'that bag'; const naive = x.comp.startsWith('more ') ? x.base + 'er' : 'more ' + x.base; return choice(r, `${subj} ___ than ${other}. (${x.base})`, x.comp, [x.base, x.sup, naive], 'e-comparative', `比較兩個人或事物，用比較級：${x.comp} than。`); },
  (r) => { const x = r.pick(D.ADJ); return textQ(`「${x.base}」的比較級是甚麼？`, x.comp, 'e-comparative', `${x.base} → ${x.comp}`); },
];
const superl: G[] = [
  (r) => { const x = r.pick(D.ADJ), A = r.pick(['Tom', 'Ben', 'Amy', 'Mary', 'Peter', 'Sue']); const naive = x.sup.startsWith('most ') ? x.base + 'est' : 'most ' + x.base; const s = x.kind === 'person' ? `Of the three children, ${A} is the ___. (${x.base})` : `Of the three, this one is the ___. (${x.base})`; return choice(r, s, x.sup, [x.base, x.comp, naive], 'e-superlative', `三個或以上比較，用 the + 最高級：the ${x.sup}。`); },
  (r) => { const x = r.pick(D.ADJ); return textQ(`「${x.base}」的最高級是甚麼？（不用寫 the）`, x.sup, 'e-superlative', `${x.base} → ${x.sup}`); },
];
const P = (prompt: string, ans: string, wrong: string[], explain: string): GenQuestion => staticChoice(prompt, ans, wrong, 'e-preposition', explain);
const prepBank: GenQuestion[] = [
  P('The cat is ___ the box. (貓在盒子裏面)', 'in', ['on', 'under', 'behind'], 'in 表示在裏面。'),
  P('The book is ___ the table. (書在桌面上)', 'on', ['in', 'under', 'between'], 'on 表示接觸並在上面。'),
  P('The ball is ___ the chair. (球在椅子下面)', 'under', ['on', 'in', 'above'], 'under 表示在下面。'),
  P('The bank is ___ the school and the park. (銀行在學校和公園之間)', 'between', ['behind', 'under', 'in'], 'between 表示在兩者之間。'),
  P('The boy is standing ___ the girl. (男孩站在女孩旁邊)', 'next to', ['under', 'in', 'on'], 'next to 表示在旁邊。'),
  P('The dog is ___ the door. (狗在門後面)', 'behind', ['in', 'on', 'between'], 'behind 表示在後面。'),
  P('The plane is flying ___ the clouds. (飛機在雲的上面飛)', 'above', ['under', 'in', 'between'], 'above 表示在上方（不接觸）。'),
  P('We live ___ Hong Kong.', 'in', ['on', 'at', 'by'], '在城市或地方「裏面」生活用 in。'),
  P('I get up ___ seven o\'clock.', 'at', ['in', 'on', 'by'], '準確的時間點用 at。'),
  P('My birthday is ___ June.', 'in', ['on', 'at', 'by'], '月份用 in。'),
  P('We have no school ___ Sunday.', 'on', ['in', 'at', 'by'], '星期幾用 on。'),
  P('She goes to school ___ bus.', 'by', ['in', 'at', 'with'], '乘搭交通工具用 by + 交通工具。'),
  P('The picture is ___ the wall. (圖畫掛在牆上)', 'on', ['in', 'under', 'between'], '掛在牆「面」上用 on。'),
  P('There is a park ___ my school. (我的學校附近有一個公園)', 'near', ['on', 'in', 'under'], 'near 表示附近。'),
];

const tag = (t: string[]) => t;
export const ENGLISH_UNITS: Unit[] = [
  U('e1-words-animals', 1, '詞彙：動物', ['看到動物的名稱，要想一想它的樣子，再記住英文字。', '練習時留意拼寫：rabbit 有兩個 b，monkey 的結尾是 ey。'], tag(['e-vocab-animals', 'e-vocab-animals-spell']), vocab(D.ANIMALS, D.COLOURS, 'e-vocab-animals')),
  U('e1-words-colours-body', 1, '詞彙：顏色與身體', ['顏色：red、blue、green、yellow…；身體：head、hand、foot、eye…。', 'foot 的眾數是 feet，tooth 的眾數是 teeth（以後會學到）。'], tag(['e-vocab-cb', 'e-vocab-cb-spell']), vocab([...D.COLOURS, ...D.BODY], D.ANIMALS, 'e-vocab-cb')),
  U('e1-words-food', 1, '詞彙：食物', ['日常食物的英文名稱。留意 sandwich、strawberry、tomato 的拼寫。'], tag(['e-vocab-food', 'e-vocab-food-spell']), vocab(D.FOOD, D.ANIMALS, 'e-vocab-food')),
  U('e1-words-family-school', 1, '詞彙：家人與學校', ['家人：father、mother、brother、sister；學校用品：book、pencil、ruler…。'], tag(['e-vocab-fs', 'e-vocab-fs-spell']), vocab([...D.FAMILY, ...D.SCHOOL], D.FOOD, 'e-vocab-fs')),
  U('e2-words-clothes-home', 2, '詞彙：衣服與家居', ['衣服：shirt、skirt、shoes、socks…；家居：kitchen、bedroom、sofa、window…。'], tag(['e-vocab-ch', 'e-vocab-ch-spell']), vocab([...D.CLOTHES, ...D.HOME], D.SCHOOL, 'e-vocab-ch')),
  U('e2-opposites', 2, '反義詞', ['意思相反的字叫反義詞：big ↔ small、hot ↔ cold。', '背誦時成對記，會記得更牢。'], tag(['e-opposite']), opposites),
  U('e2-numbers', 2, '數字與序數', ['13 至 19 以 -teen 結尾；30、40…以 -ty 結尾。留意 forty（沒有 u）和 fifteen／fifty。', '21 至 99 的兩位數中間加連字號：twenty-one、forty-five。', '序數：first、second、third，之後多數加 -th：fourth、fifth…；twelfth 要留意。'], tag(['e-number-words', 'e-teen-ty', 'e-ordinal']), numbers),
  U('e2-articles', 2, 'a 與 an', ['看「發音」，不是看拼寫：以元音發音開頭用 an（an apple、an hour），以輔音發音開頭用 a（a university）。'], tag(['e-a-an']), articles),
  U('e3-words-places-jobs', 3, '詞彙：地方與職業', ['認識常見的地方和職業，例如 hospital、supermarket、doctor、police officer。'], tag(['e-vocab-pj', 'e-vocab-pj-spell']), vocab([...D.PLACES, ...D.JOBS], D.HOME, 'e-vocab-pj')),
  U('e3-present-simple', 3, '一般現在式', ['說日常習慣或事實，用一般現在式。', 'he、she、it 和單數名詞：動詞加 -s／-es（watches、studies、has、goes）；I、you、we、they：用動詞原形。', '問句用 Do／Does；否定用 don\'t／doesn\'t，後面動詞用原形。'], tag(['e-present-simple', 'e-present-simple-q', 'e-present-simple-neg']), presentSimple),
  U('e3-time', 3, '用英文說時間', ['整點：It\'s three o\'clock。30 分：half past three。15 分：a quarter past three。45 分：a quarter to four。', '1–29 分用 past（過），31–59 分用 to（差…到）：ten past five、twenty to six。'], tag(['e-clock']), clock),
  { ...U('e3-prepositions-more', 3, '介詞練習', ['in（裏面）、on（上面）、under（下面）、behind（後面）、between（之間）、next to（旁邊）。', '時間：at + 時間點、on + 星期、in + 月份。'], tag(['e-preposition']), []), gens: undefined, bank: prepBank },
  U('e4-words-transport-weather', 4, '詞彙：交通與天氣自然', ['交通工具與天氣、自然景物的詞彙，例如 MTR、tram、typhoon、rainbow。'], tag(['e-vocab-tw', 'e-vocab-tw-spell']), vocab([...D.TRANSPORT, ...D.WEATHER], D.PLACES, 'e-vocab-tw')),
  U('e4-present-continuous', 4, '現在進行式', ['說「正在發生」的事：am／is／are + 動詞 -ing。常見提示：now、Look!、Listen!、at the moment。', '-ing 的拼寫：make → making（去 e）、run → running（雙寫字母）、study → studying。'], tag(['e-present-continuous', 'e-be-ing', 'e-ing-spelling']), presentCont),
  U('e4-irregular-past', 4, '過去式（規則與不規則）', ['說已經發生的事用過去式。規則動詞加 -ed：played、watched、studied。', '不規則動詞要逐個背：go → went、see → saw、eat → ate、have → had、buy → bought。', '提示詞：yesterday、last week、two days ago。'], tag(['e-irregular-past', 'e-regular-past']), pastGens),
  U('e4-plurals', 4, '名詞眾數', ['一般加 -s；s、x、ch、sh 結尾加 -es；輔音 + y 結尾變 -ies；部分 f／fe 結尾變 -ves。', '不規則：child → children、man → men、foot → feet、tooth → teeth、mouse → mice、person → people。'], tag(['e-plural']), plurals),
  U('e5-words-hobbies-advanced', 5, '詞彙：興趣與生活主題', ['興趣活動與社區、環境等主題詞彙，例如 hiking、badminton、environment、recycle、volunteer。'], tag(['e-vocab-ha', 'e-vocab-ha-spell']), vocab([...D.HOBBIES, ...D.ADVANCED1], D.TRANSPORT, 'e-vocab-ha')),
  U('e5-comparatives-gen', 5, '比較級', ['比較兩個人或事物，用「比較級 + than」。', '短形容詞加 -er（taller）；以 y 結尾變 -ier（happier）；單音節短母音加輔音要雙寫（bigger、hotter）。', '長形容詞用 more（more beautiful）；不規則：good → better、bad → worse。'], tag(['e-comparative']), compar),
  U('e5-superlatives', 5, '最高級', ['三個或以上相比，用「the + 最高級」：the tallest、the most beautiful、the best、the worst。'], tag(['e-superlative']), superl),
  U('e5-dates', 5, '月份與星期', ['12 個月：January、February、March、April、May、June、July、August、September、October、November、December。', '月份和星期的第一個字母要大寫。'], tag(['e-months', 'e-days']), dates),
  U('e6-words-advanced', 6, '詞彙：形容詞與動詞進階', ['描述人物性格和事物的形容詞，以及常用的動詞，例如 brave、honest、polite、protect、improve。'], tag(['e-vocab-adv', 'e-vocab-adv-spell']), vocab([...D.ADVANCED2, ...D.ADVANCED1], D.HOBBIES, 'e-vocab-adv')),
  U('e6-tenses', 6, '時態綜合', ['看提示詞選時態：every day／usually → 一般現在式；Look!／now → 現在進行式；yesterday／last week → 過去式；tomorrow／next week → will + 原形。', '主語是 he／she／單數時，一般現在式的動詞要加 -s／-es。'], tag(['e-tense-mix']), tenses),
];
