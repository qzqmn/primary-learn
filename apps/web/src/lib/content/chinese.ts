import type { Unit, GenQuestion } from './types';
import type { Rng } from './rng';
import { choice, staticChoice } from './helpers';
import { ANTONYMS, DE, IDIOMS, MEASURE, MEASURE_WORDS, SYNONYMS, ZAI, type Idiom } from './chinese-data';

type G = (r: Rng) => GenQuestion;
const U = (id: string, grade: number, title: string, intro: string[], tags: string[], gens: G[]): Unit => ({ id, subject: 'chinese', grade, title, intro, tags, gens, source: 'builtin' });

const measure: G[] = [
  (r) => { const [n, m, ex] = r.pick(MEASURE); const wrong = r.shuffle(MEASURE_WORDS.filter((w) => w !== m && !ex.includes(w))).slice(0, 3); return choice(r, `一＿＿${n}`, m, wrong, 'c-measure', `「${n}」配的量詞是「${m}」：一${m}${n}。`); },
  (r) => { const [n, m, ex] = r.pick(MEASURE); const wrong = r.shuffle(MEASURE_WORDS.filter((w) => w !== m && !ex.includes(w))).slice(0, 3); return choice(r, `弟弟有三＿＿${n}。`, m, wrong, 'c-measure', `「${n}」配的量詞是「${m}」：三${m}${n}。`); },
];
const antonym: G[] = [
  (r) => { const [a, b] = r.pick(ANTONYMS); const [q, ans] = r.next() < 0.5 ? [a, b] : [b, a]; const others = ANTONYMS.filter((p) => p[0] !== a).flat().filter((w) => w.length === ans.length && w !== q && w !== ans); return choice(r, `「${q}」的反義詞是甚麼？`, ans, r.shuffle(others).slice(0, 3), 'c-antonym', `${q} ↔ ${ans}`); },
];
const synonym: G[] = [
  (r) => { const [a, b] = r.pick(SYNONYMS); const [q, ans] = r.next() < 0.5 ? [a, b] : [b, a]; const others = SYNONYMS.filter((p) => p[0] !== a).flat().filter((w) => w !== q && w !== ans); return choice(r, `「${q}」的近義詞是甚麼？`, ans, r.shuffle(others).slice(0, 3), 'c-synonym', `${q} ≈ ${ans}`); },
];
const de: G[] = [
  (r) => { const x = r.pick(DE); return choice(r, `選出適當的字：${x.s}`, x.a, ['的', '地', '得'].filter((c) => c !== x.a), 'c-de', x.why); },
];
const zai: G[] = [
  (r) => { const x = r.pick(ZAI); return choice(r, `選出適當的字：${x.s}`, x.a, ['再', '在'].filter((c) => c !== x.a), 'c-zai', x.why); },
];

const bigThemes = (t: Idiom['theme']) => (t === 'effort' || t === 'foolish' ? 'story' : 'plain');
function idiomGens(list: Idiom[], pool: Idiom[]): G[] {
  // 干擾項只從「性質不同」的成語中選，避免句子同時適合兩個成語
  const far = (x: Idiom) => pool.filter((y) => y.theme !== x.theme && y.w !== x.w);
  return [
    (r) => { const x = r.pick(list); return choice(r, `「${x.w}」的意思是甚麼？`, x.meaning, r.shuffle(far(x)).slice(0, 3).map((y) => y.meaning), 'c-idiom', `${x.w}：${x.meaning}。`); },
    (r) => { const x = r.pick(list); return choice(r, `選出適當的成語：${x.blank}`, x.w, r.shuffle(far(x)).slice(0, 3).map((y) => y.w), 'c-idiom-use', `${x.w}：${x.meaning}。`); },
  ];
}
const feelingState = IDIOMS.filter((i) => i.theme === 'feeling' || i.theme === 'state');
const effort = IDIOMS.filter((i) => i.theme === 'effort');
const foolish = IDIOMS.filter((i) => i.theme === 'foolish');
void bigThemes;

const DE_INTRO = ['「的」放在名詞前面：我的書包、美麗的風景。', '「地」放在動詞前面，說明動作的樣子：開心地唱歌、認真地做功課。', '「得」放在動詞後面，說明動作的結果或程度：跑得很快、睡得很香。', '（不同學校對「的／地／得」的要求可能不同，請以老師的指引為準。）'];

export const CHINESE_UNITS: Unit[] = [
  U('c1-measure-more', 1, '量詞（更多練習）', ['量詞是用來數事物的單位詞，要配合名詞：一本書、一隻貓、一條魚、一張紙。', '同一類東西多用同一個量詞，例如細長的東西常用「條」（一條魚、一條河、一條褲）。'], ['c-measure'], measure),
  U('c2-antonyms-more', 2, '反義詞（更多練習）', ['意思相反的詞語叫反義詞：大 ↔ 小、多 ↔ 少、開 ↔ 關。', '成對記憶，比單獨背誦更容易記得牢。'], ['c-antonym'], antonym),
  U('c2-zai', 2, '「再」和「在」', ['「在」表示所處的地方或動作正在進行：在家、正在睡覺。', '「再」表示重複或繼續：再說一遍、再見。'], ['c-zai'], zai),
  U('c3-synonyms-more', 3, '近義詞（更多練習）', ['意思相近的詞語叫近義詞：高興 ≈ 開心、美麗 ≈ 漂亮。', '近義詞的意思相近但不一定完全相同，要留意句子的語氣和搭配。'], ['c-synonym'], synonym),
  U('c3-de', 3, '「的」「地」「得」', DE_INTRO, ['c-de'], de),
  U('c4-idioms-feeling', 4, '成語（心情與狀態）', ['成語大多由四個字組成，有固定的意思。', '學成語時要明白它的意思，再配合語境使用。'], ['c-idiom', 'c-idiom-use'], idiomGens(feelingState, IDIOMS)),
  U('c5-idioms-effort', 5, '成語（態度與毅力）', ['這些成語和做事的態度有關，例如「半途而廢」是不好的態度，「愚公移山」是值得學習的精神。'], ['c-idiom', 'c-idiom-use'], idiomGens(effort, IDIOMS)),
  U('c6-idioms-fable', 6, '成語（寓言與故事）', ['很多成語來自寓言故事，例如「守株待兔」「亡羊補牢」。', '記住故事，就更容易明白成語的意思和比喻。'], ['c-idiom', 'c-idiom-use'], idiomGens(foolish, IDIOMS)),
];
void staticChoice;
