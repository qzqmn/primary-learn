// 英文詞表與語法表：全部為常見基礎詞彙，中文釋義用香港慣用字詞。每個詞表內的中文釋義互不重複，
// 以免單選題的干擾項剛好也是正確答案。
export type W = readonly [en: string, zh: string];

export const ANIMALS: W[] = [['cat', '貓'], ['dog', '狗'], ['bird', '鳥'], ['fish', '魚'], ['rabbit', '兔子'], ['tiger', '老虎'], ['lion', '獅子'], ['elephant', '大象'], ['monkey', '猴子'], ['horse', '馬'], ['cow', '牛'], ['pig', '豬'], ['duck', '鴨'], ['chicken', '雞'], ['sheep', '綿羊'], ['bear', '熊'], ['giraffe', '長頸鹿'], ['panda', '熊貓'], ['snake', '蛇'], ['frog', '青蛙'], ['butterfly', '蝴蝶'], ['dolphin', '海豚'], ['turtle', '烏龜'], ['mouse', '老鼠']];
export const COLOURS: W[] = [['red', '紅色'], ['blue', '藍色'], ['green', '綠色'], ['yellow', '黃色'], ['orange', '橙色'], ['purple', '紫色'], ['pink', '粉紅色'], ['black', '黑色'], ['white', '白色'], ['brown', '啡色'], ['grey', '灰色']];
export const FOOD: W[] = [['apple', '蘋果'], ['banana', '香蕉'], ['grapes', '提子'], ['watermelon', '西瓜'], ['strawberry', '士多啤梨'], ['bread', '麵包'], ['rice', '米飯'], ['noodles', '麵條'], ['egg', '雞蛋'], ['milk', '牛奶'], ['cake', '蛋糕'], ['cheese', '芝士'], ['tea', '茶'], ['juice', '果汁'], ['water', '水'], ['soup', '湯'], ['sandwich', '三文治'], ['hamburger', '漢堡包'], ['ice cream', '雪糕'], ['potato', '薯仔'], ['tomato', '番茄'], ['carrot', '紅蘿蔔']];
export const BODY: W[] = [['head', '頭'], ['hand', '手'], ['foot', '腳'], ['eye', '眼睛'], ['ear', '耳朵'], ['nose', '鼻子'], ['mouth', '口'], ['hair', '頭髮'], ['arm', '手臂'], ['leg', '腿'], ['finger', '手指'], ['tooth', '牙齒'], ['face', '臉'], ['shoulder', '肩膀'], ['knee', '膝蓋']];
export const FAMILY: W[] = [['father', '爸爸'], ['mother', '媽媽'], ['brother', '哥哥／弟弟'], ['sister', '姐姐／妹妹'], ['baby', '嬰兒'], ['family', '家庭'], ['friend', '朋友'], ['teacher', '老師'], ['student', '學生']];
export const SCHOOL: W[] = [['book', '書'], ['pencil', '鉛筆'], ['pen', '筆'], ['ruler', '尺'], ['eraser', '橡皮擦'], ['schoolbag', '書包'], ['desk', '書桌'], ['chair', '椅子'], ['classroom', '課室'], ['library', '圖書館'], ['playground', '操場'], ['computer', '電腦'], ['blackboard', '黑板'], ['notebook', '筆記簿'], ['scissors', '剪刀'], ['glue', '膠水']];
export const CLOTHES: W[] = [['shirt', '恤衫'], ['skirt', '裙'], ['dress', '連身裙'], ['trousers', '長褲'], ['shorts', '短褲'], ['shoes', '鞋'], ['socks', '襪'], ['hat', '帽'], ['coat', '外套'], ['uniform', '校服'], ['glasses', '眼鏡'], ['umbrella', '雨傘']];
export const HOME: W[] = [['house', '房子'], ['kitchen', '廚房'], ['bedroom', '睡房'], ['bathroom', '浴室'], ['living room', '客廳'], ['door', '門'], ['window', '窗'], ['bed', '床'], ['table', '桌子'], ['sofa', '梳化'], ['garden', '花園']];
export const PLACES: W[] = [['park', '公園'], ['hospital', '醫院'], ['supermarket', '超級市場'], ['restaurant', '餐廳'], ['cinema', '電影院'], ['museum', '博物館'], ['post office', '郵局'], ['bank', '銀行'], ['bus stop', '巴士站'], ['station', '車站'], ['airport', '機場'], ['zoo', '動物園'], ['market', '街市'], ['school', '學校']];
export const JOBS: W[] = [['doctor', '醫生'], ['nurse', '護士'], ['police officer', '警察'], ['firefighter', '消防員'], ['farmer', '農夫'], ['driver', '司機'], ['cook', '廚師'], ['pilot', '機師'], ['artist', '畫家'], ['dentist', '牙醫'], ['engineer', '工程師'], ['singer', '歌手'], ['scientist', '科學家'], ['postman', '郵差']];
export const TRANSPORT: W[] = [['bus', '巴士'], ['taxi', '的士'], ['train', '火車'], ['ship', '船'], ['plane', '飛機'], ['bicycle', '單車'], ['MTR', '港鐵'], ['tram', '電車'], ['ferry', '渡輪'], ['helicopter', '直升機']];
export const WEATHER: W[] = [['sunny', '晴朗的'], ['rainy', '下雨的'], ['cloudy', '多雲的'], ['windy', '有風的'], ['snow', '雪'], ['rain', '雨'], ['sun', '太陽'], ['moon', '月亮'], ['star', '星星'], ['sky', '天空'], ['mountain', '山'], ['river', '河'], ['sea', '海'], ['tree', '樹'], ['flower', '花'], ['grass', '草'], ['typhoon', '颱風'], ['rainbow', '彩虹']];
export const HOBBIES: W[] = [['swimming', '游泳'], ['reading', '閱讀'], ['dancing', '跳舞'], ['singing', '唱歌'], ['drawing', '繪畫'], ['cooking', '烹飪'], ['running', '跑步'], ['cycling', '踏單車'], ['football', '足球'], ['basketball', '籃球'], ['badminton', '羽毛球'], ['table tennis', '乒乓球'], ['hiking', '遠足'], ['shopping', '購物']];
export const ADVANCED1: W[] = [['environment', '環境'], ['pollution', '污染'], ['recycle', '回收'], ['energy', '能源'], ['health', '健康'], ['adventure', '冒險'], ['culture', '文化'], ['festival', '節日'], ['tradition', '傳統'], ['volunteer', '義工'], ['community', '社區'], ['invention', '發明']];
export const ADVANCED2: W[] = [['dangerous', '危險的'], ['delicious', '美味的'], ['enormous', '巨大的'], ['curious', '好奇的'], ['brave', '勇敢的'], ['honest', '誠實的'], ['polite', '有禮貌的'], ['generous', '慷慨的'], ['lazy', '懶惰的'], ['patient', '有耐性的'], ['crowded', '擠迫的'], ['peaceful', '寧靜的'], ['popular', '受歡迎的'], ['protect', '保護'], ['imagine', '想像'], ['improve', '改善'], ['survive', '生存'], ['discover', '發現']];

/** 動詞表：[原形, 過去式, 現在分詞, 第三身單數, 中文, 常搭配的受詞或地點, 是否不規則, 是否狀態動詞] */
export type V = { base: string; past: string; ing: string; s: string; zh: string; tail: string; irregular: boolean; stative?: boolean };
const v = (base: string, past: string, ing: string, s: string, zh: string, tail: string, irregular: boolean, stative = false): V => ({ base, past, ing, s, zh, tail, irregular, stative });
export const VERBS: V[] = [
  v('go', 'went', 'going', 'goes', '去', 'to the park', true), v('see', 'saw', 'seeing', 'sees', '看見', 'a movie', true), v('eat', 'ate', 'eating', 'eats', '吃', 'rice', true),
  v('have', 'had', 'having', 'has', '有／吃', 'lunch', true), v('buy', 'bought', 'buying', 'buys', '買', 'a toy', true), v('take', 'took', 'taking', 'takes', '乘搭／拿', 'a bus', true),
  v('make', 'made', 'making', 'makes', '做', 'a cake', true), v('come', 'came', 'coming', 'comes', '來', 'home early', true), v('give', 'gave', 'giving', 'gives', '給', 'a gift to Mary', true),
  v('get', 'got', 'getting', 'gets', '得到', 'a present', true), v('run', 'ran', 'running', 'runs', '跑', 'in the park', true), v('write', 'wrote', 'writing', 'writes', '寫', 'a letter', true),
  v('sit', 'sat', 'sitting', 'sits', '坐', 'on the chair', true), v('stand', 'stood', 'standing', 'stands', '站', 'near the door', true), v('swim', 'swam', 'swimming', 'swims', '游泳', 'in the sea', true),
  v('drink', 'drank', 'drinking', 'drinks', '喝', 'milk', true), v('sing', 'sang', 'singing', 'sings', '唱', 'a song', true), v('speak', 'spoke', 'speaking', 'speaks', '說', 'English', true),
  v('sleep', 'slept', 'sleeping', 'sleeps', '睡覺', 'early', true), v('bring', 'brought', 'bringing', 'brings', '帶來', 'a book', true), v('tell', 'told', 'telling', 'tells', '告訴', 'a story', true),
  v('find', 'found', 'finding', 'finds', '找到', 'a key', true), v('meet', 'met', 'meeting', 'meets', '遇見', 'a friend', true), v('teach', 'taught', 'teaching', 'teaches', '教', 'English', true),
  v('catch', 'caught', 'catching', 'catches', '接住／捉住', 'a ball', true), v('fly', 'flew', 'flying', 'flies', '放（風箏）／飛', 'a kite', true), v('draw', 'drew', 'drawing', 'draws', '畫', 'a picture', true),
  v('drive', 'drove', 'driving', 'drives', '駕駛', 'a car', true), v('ride', 'rode', 'riding', 'rides', '騎', 'a bike', true), v('wear', 'wore', 'wearing', 'wears', '穿', 'a hat', true),
  v('win', 'won', 'winning', 'wins', '贏', 'the game', true), v('lose', 'lost', 'losing', 'loses', '遺失', 'a key', true), v('break', 'broke', 'breaking', 'breaks', '打破', 'a cup', true),
  v('build', 'built', 'building', 'builds', '建造', 'a house', true), v('forget', 'forgot', 'forgetting', 'forgets', '忘記', 'the answer', true), v('hear', 'heard', 'hearing', 'hears', '聽見', 'a noise', true),
  v('keep', 'kept', 'keeping', 'keeps', '飼養／保留', 'a pet', true), v('send', 'sent', 'sending', 'sends', '寄', 'a message', true), v('spend', 'spent', 'spending', 'spends', '花（錢）', 'ten dollars', true),
  v('sell', 'sold', 'selling', 'sells', '賣', 'toys', true), v('throw', 'threw', 'throwing', 'throws', '擲', 'a ball', true),
  v('play', 'played', 'playing', 'plays', '玩', 'football', false), v('watch', 'watched', 'watching', 'watches', '看', 'TV', false), v('study', 'studied', 'studying', 'studies', '學習', 'English', false),
  v('wash', 'washed', 'washing', 'washes', '洗', 'the dishes', false), v('clean', 'cleaned', 'cleaning', 'cleans', '清潔', 'the room', false), v('cook', 'cooked', 'cooking', 'cooks', '煮', 'dinner', false),
  v('walk', 'walked', 'walking', 'walks', '步行', 'to school', false), v('help', 'helped', 'helping', 'helps', '幫助', 'his mother', false), v('dance', 'danced', 'dancing', 'dances', '跳舞', 'in the hall', false),
  v('carry', 'carried', 'carrying', 'carries', '攜帶', 'a bag', false), v('cry', 'cried', 'crying', 'cries', '哭', 'loudly', false), v('try', 'tried', 'trying', 'tries', '嘗試', 'again', false),
  v('open', 'opened', 'opening', 'opens', '打開', 'the door', false), v('close', 'closed', 'closing', 'closes', '關上', 'the window', false), v('wait', 'waited', 'waiting', 'waits', '等', 'for the bus', false),
  v('paint', 'painted', 'painting', 'paints', '繪畫', 'a picture', false), v('visit', 'visited', 'visiting', 'visits', '探訪', 'the museum', false), v('listen', 'listened', 'listening', 'listens', '聽', 'to music', false),
  v('kick', 'kicked', 'kicking', 'kicks', '踢', 'the ball', false), v('like', 'liked', 'liking', 'likes', '喜歡', 'apples', false, true), v('love', 'loved', 'loving', 'loves', '愛', 'music', false, true),
  v('want', 'wanted', 'wanting', 'wants', '想要', 'a new bag', false, true),
];

/** 單數 → 眾數 */
export const PLURALS: { s: string; p: string; rule: string }[] = [
  { s: 'book', p: 'books', rule: '一般名詞直接加 -s。' }, { s: 'cat', p: 'cats', rule: '一般名詞直接加 -s。' }, { s: 'box', p: 'boxes', rule: '以 x 結尾的字加 -es。' },
  { s: 'bus', p: 'buses', rule: '以 s 結尾的字加 -es。' }, { s: 'dish', p: 'dishes', rule: '以 sh 結尾的字加 -es。' }, { s: 'watch', p: 'watches', rule: '以 ch 結尾的字加 -es。' },
  { s: 'fox', p: 'foxes', rule: '以 x 結尾的字加 -es。' }, { s: 'city', p: 'cities', rule: '輔音字母 + y 結尾，把 y 改成 i 再加 -es。' }, { s: 'baby', p: 'babies', rule: '輔音字母 + y 結尾，把 y 改成 i 再加 -es。' },
  { s: 'story', p: 'stories', rule: '輔音字母 + y 結尾，把 y 改成 i 再加 -es。' }, { s: 'country', p: 'countries', rule: '輔音字母 + y 結尾，把 y 改成 i 再加 -es。' }, { s: 'party', p: 'parties', rule: '輔音字母 + y 結尾，把 y 改成 i 再加 -es。' },
  { s: 'boy', p: 'boys', rule: '元音字母 + y 結尾，直接加 -s。' }, { s: 'day', p: 'days', rule: '元音字母 + y 結尾，直接加 -s。' }, { s: 'toy', p: 'toys', rule: '元音字母 + y 結尾，直接加 -s。' },
  { s: 'leaf', p: 'leaves', rule: '以 f 結尾的字，通常把 f 改成 v 再加 -es。' }, { s: 'knife', p: 'knives', rule: '以 fe 結尾的字，通常把 fe 改成 v 再加 -es。' }, { s: 'wife', p: 'wives', rule: '以 fe 結尾的字，通常把 fe 改成 v 再加 -es。' },
  { s: 'shelf', p: 'shelves', rule: '以 f 結尾的字，通常把 f 改成 v 再加 -es。' }, { s: 'potato', p: 'potatoes', rule: '部分以 o 結尾的字加 -es，如 potato、tomato。' }, { s: 'tomato', p: 'tomatoes', rule: '部分以 o 結尾的字加 -es，如 potato、tomato。' },
  { s: 'child', p: 'children', rule: '不規則眾數，要背。' }, { s: 'man', p: 'men', rule: '不規則眾數，要背。' }, { s: 'woman', p: 'women', rule: '不規則眾數，要背。' }, { s: 'foot', p: 'feet', rule: '不規則眾數，要背。' },
  { s: 'tooth', p: 'teeth', rule: '不規則眾數，要背。' }, { s: 'mouse', p: 'mice', rule: '不規則眾數，要背。' }, { s: 'person', p: 'people', rule: '不規則眾數，要背。' }, { s: 'goose', p: 'geese', rule: '不規則眾數，要背。' },
  { s: 'sheep', p: 'sheep', rule: 'sheep 的單數和眾數相同。' }, { s: 'fish', p: 'fish', rule: 'fish 的單數和眾數通常相同。' },
];

/** 形容詞：[原級, 比較級, 最高級, 形容什麼] */
export type A = { base: string; comp: string; sup: string; kind: 'person' | 'thing' };
const a = (base: string, comp: string, sup: string, kind: 'person' | 'thing'): A => ({ base, comp, sup, kind });
export const ADJ: A[] = [
  a('tall', 'taller', 'tallest', 'person'), a('short', 'shorter', 'shortest', 'person'), a('strong', 'stronger', 'strongest', 'person'), a('young', 'younger', 'youngest', 'person'), a('old', 'older', 'oldest', 'person'),
  a('fast', 'faster', 'fastest', 'person'), a('slow', 'slower', 'slowest', 'person'), a('happy', 'happier', 'happiest', 'person'), a('funny', 'funnier', 'funniest', 'person'), a('busy', 'busier', 'busiest', 'person'), a('fat', 'fatter', 'fattest', 'person'),
  a('big', 'bigger', 'biggest', 'thing'), a('small', 'smaller', 'smallest', 'thing'), a('long', 'longer', 'longest', 'thing'), a('heavy', 'heavier', 'heaviest', 'thing'), a('large', 'larger', 'largest', 'thing'),
  a('easy', 'easier', 'easiest', 'thing'), a('hot', 'hotter', 'hottest', 'thing'), a('cold', 'colder', 'coldest', 'thing'), a('thin', 'thinner', 'thinnest', 'thing'),
  a('beautiful', 'more beautiful', 'most beautiful', 'thing'), a('interesting', 'more interesting', 'most interesting', 'thing'), a('difficult', 'more difficult', 'most difficult', 'thing'),
  a('expensive', 'more expensive', 'most expensive', 'thing'), a('delicious', 'more delicious', 'most delicious', 'thing'), a('famous', 'more famous', 'most famous', 'thing'), a('important', 'more important', 'most important', 'thing'),
  a('good', 'better', 'best', 'thing'), a('bad', 'worse', 'worst', 'thing'),
];

export const OPPOSITES: [string, string][] = [['big', 'small'], ['tall', 'short'], ['hot', 'cold'], ['fast', 'slow'], ['happy', 'sad'], ['open', 'close'], ['day', 'night'], ['up', 'down'], ['full', 'empty'], ['clean', 'dirty'], ['early', 'late'], ['near', 'far'], ['heavy', 'light'], ['wet', 'dry'], ['rich', 'poor'], ['strong', 'weak'], ['easy', 'difficult'], ['young', 'old'], ['good', 'bad'], ['hard', 'soft'], ['wide', 'narrow'], ['come', 'go'], ['buy', 'sell'], ['push', 'pull'], ['win', 'lose'], ['love', 'hate'], ['inside', 'outside'], ['summer', 'winter']];

export const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
export const TENS: Record<number, string> = { 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety' };
export const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** a / an：依「發音」而不是拼寫 */
export const A_AN: { w: string; art: 'a' | 'an'; why?: string }[] = [
  ...['book', 'cat', 'dog', 'pen', 'bag', 'car', 'house', 'boy', 'girl', 'student', 'teacher', 'table', 'kite', 'banana', 'pencil'].map((w) => ({ w, art: 'a' as const })),
  ...['apple', 'egg', 'orange', 'elephant', 'umbrella', 'ice cream', 'ant', 'owl', 'eraser', 'ear', 'eye', 'island'].map((w) => ({ w, art: 'an' as const })),
  { w: 'hour', art: 'an', why: 'hour 的 h 不發音，讀作以元音開頭，所以用 an。' }, { w: 'university', art: 'a', why: 'university 讀作 /ju/ 開頭（輔音），所以用 a。' },
  { w: 'uniform', art: 'a', why: 'uniform 讀作 /ju/ 開頭（輔音），所以用 a。' }, { w: 'honest boy', art: 'an', why: 'honest 的 h 不發音，所以用 an。' },
];
