#!/usr/bin/env node
// 端到端煙霧測試：對一個「全新」的伺服器跑完整流程。
//   BASE_URL=http://localhost:3000 SETUP_TOKEN=xxxx DATA_DIR=./data node scripts/smoke.mjs
import Database from 'better-sqlite3';
import { hash } from '@node-rs/argon2';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN = process.env.SETUP_TOKEN || '';
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
let failed = 0, passed = 0;
const check = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name} ${extra}`); }
};
const section = (t) => console.log(`\n# ${t}`);

function client() {
  let cookie = '';
  return {
    async req(url, { method = 'GET', body, headers = {}, origin = BASE, redirect = 'manual', binary = false, rawBody = false } = {}) {
      const res = await fetch(BASE + url, {
        method, redirect,
        headers: { ...(body !== undefined && !rawBody ? { 'content-type': 'application/json' } : {}), ...(method !== 'GET' && origin ? { origin } : {}), ...(cookie ? { cookie } : {}), ...headers },
        body: body === undefined ? undefined : rawBody ? body : JSON.stringify(body),
      });
      const sc = res.headers.getSetCookie?.() ?? [];
      for (const c of sc) { const [kv] = c.split(';'); if (kv.startsWith('hkpl_sid=')) cookie = kv.endsWith('=') ? '' : kv; }
      if (binary) return { status: res.status, buf: Buffer.from(await res.arrayBuffer()), headers: res.headers };
      const text = await res.text();
      let json = null; try { json = JSON.parse(text); } catch {}
      return { status: res.status, json, text, headers: res.headers, location: res.headers.get('location') };
    },
  };
}
const post = (c, url, body) => c.req(url, { method: 'POST', body });
const patch = (c, url, body) => c.req(url, { method: 'PATCH', body });

// 解答純算術題（只用來驗證伺服器批改，答案不會在 start 回應裡）
function solve(prompt) {
  let m = prompt.match(/^(\d+) ([+−]) (\d+) = \?$/); if (m) return String(m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3]);
  m = prompt.match(/^□ \+ (\d+) = (\d+)/); if (m) return String(+m[2] - +m[1]);
  m = prompt.match(/^(\d+) − □ = (\d+)/); if (m) return String(+m[1] - +m[2]);
  const n = prompt.match(/\d+/g)?.map(Number) ?? [];
  if (n.length === 2 && /再給他/.test(prompt)) return String(n[0] + n[1]);
  if (n.length === 2 && /飛走/.test(prompt)) return String(n[0] - n[1]);
  return null;
}

const redir = (r) => r.status >= 300 && r.status < 400;
const get = async (url) => (await fetch(BASE + url, { redirect: 'manual' }));

console.log(`Smoke test → ${BASE}`);

section('基本與安全標頭');
{
  const h = await get('/api/healthz');
  check('healthz 200', h.status === 200);
  check('X-Frame-Options', h.headers.get('x-frame-options') === 'DENY');
  check('nosniff', h.headers.get('x-content-type-options') === 'nosniff');
  const home = await get('/');
  check('未設定時 / 導向 /setup', home.status >= 300 && home.status < 400 && (home.headers.get('location') ?? '').includes('/setup'));
  const bad = await get('/api/unsubscribe?e=a@b.com&t=bad');
  check('無效退訂連結 400', bad.status === 400);
}

section('首次設定精靈');
const admin = client();
{
  const wrong = await post(admin, '/api/setup', { setupToken: 'WRONG-TOKEN', orgName: 'T', timezone: 'Asia/Hong_Kong', username: 'boss', email: 'boss@example.com', password: 'Correct-horse-9' });
  check('錯誤設定碼被拒', wrong.status === 400);
  const noOrigin = await admin.req('/api/setup', { method: 'POST', body: { setupToken: TOKEN }, origin: null });
  check('缺少 Origin 被拒 (CSRF)', noOrigin.status === 403);
  const evil = await admin.req('/api/setup', { method: 'POST', body: { setupToken: TOKEN }, origin: 'https://evil.example' });
  check('外站 Origin 被拒 (CSRF)', evil.status === 403);
  const ok = await post(admin, '/api/setup', { setupToken: TOKEN, orgName: '測試小學', timezone: 'Asia/Hong_Kong', username: 'boss', email: 'boss@example.com', password: 'Correct-horse-9' });
  check('設定成功', ok.status === 200 && ok.json?.ok, JSON.stringify(ok.json));
  check('回傳一次性恢復碼', Array.isArray(ok.json?.recoveryCodes) && ok.json.recoveryCodes.length === 8);
  const again = await post(client(), '/api/setup', { setupToken: TOKEN, orgName: 'X', timezone: 'Asia/Hong_Kong', username: 'hack', email: 'h@example.com', password: 'Correct-horse-9' });
  check('設定完成後 /setup 永久關閉 (404)', again.status === 404);
}

section('管理員建立老師、老師登入');
const t1 = client(), t2 = client();
let T1PW = '', T2PW = '';
{
  const a = await post(admin, '/api/admin/teachers', { username: 'miss.chan', displayName: '陳老師' });
  check('建立老師 1', a.json?.ok && a.json.password?.length >= 10, JSON.stringify(a.json));
  T1PW = a.json.password;
  const b = await post(admin, '/api/admin/teachers', { username: 'mr.lee', displayName: '李老師' });
  T2PW = b.json.password;
  const dup = await post(admin, '/api/admin/teachers', { username: 'miss.chan', displayName: 'x' });
  check('重複用戶名 409', dup.status === 409);
  const l1 = await post(t1, '/api/auth/login', { identifier: 'miss.chan', password: T1PW });
  check('老師登入且須改密碼', l1.json?.ok && l1.json.mustChangePassword === true);
  const blocked = await t1.req('/admin/classes');
  check('未改密碼前被導向改密碼頁', redir(blocked) && (blocked.location ?? '').includes('/account/password'));
  const ch = await post(t1, '/api/account/password', { currentPassword: T1PW, newPassword: 'Teacher-pass-1' });
  check('老師改密碼成功', ch.json?.ok, JSON.stringify(ch.json));
  T1PW = 'Teacher-pass-1';
  await post(t2, '/api/auth/login', { identifier: 'mr.lee', password: T2PW });
  await post(t2, '/api/account/password', { currentPassword: T2PW, newPassword: 'Teacher-pass-2' });
  const pg = await t1.req('/admin/classes');
  check('老師可進入班級頁', pg.status === 200 && pg.text.includes('班級與學生'));
  const people = await t1.req('/admin/people');
  check('老師不能進入管理員專用頁（老師與家長名單）', redir(people), `status ${people.status}`);
  for (const u of ['/admin/audit', '/admin/settings', '/admin/settings/mail']) check(`老師不能進入 ${u}`, redir(await t1.req(u)));
  const st = await patch(t1, '/api/admin/settings', { orgName: 'x' });
  check('老師不能改系統設定 (403)', st.status === 403);
}

section('班級與學生');
let cls, cls2, studentA, studentB;
{
  const c = await post(t1, '/api/classes', { name: '1A', grade: 1 });
  check('老師建立班級', c.json?.ok, JSON.stringify(c.json));
  cls = c.json.id;
  const c2 = await post(t2, '/api/classes', { name: '3B', grade: 3 });
  cls2 = c2.json.id;
  const a = await post(t1, `/api/classes/${cls}/students`, { nickname: '小熊' });
  check('新增學生並回傳初始密碼', a.json?.created?.[0]?.password?.length >= 8, JSON.stringify(a.json));
  studentA = { nick: '小熊', pw: a.json.created[0].password, id: null };
  const dup = await post(t1, `/api/classes/${cls}/students`, { nickname: '小熊' });
  check('同班重複暱稱被拒', dup.status === 409);
  const spaced = await post(t1, `/api/classes/${cls}/students`, { nickname: 'a b' });
  check('含空格暱稱被拒', spaced.status === 400);
  const imp = await post(t1, `/api/classes/${cls}/students`, { csv: '暱稱,備註\n阿虎,學號03\n星星,學號04\n小熊,重複\n  \n壞 名字' });
  check('CSV 匯入：2 成功、2 失敗', imp.json?.created?.length === 2 && imp.json?.failed?.length === 2, JSON.stringify(imp.json));
  studentB = { nick: '阿虎', pw: imp.json.created[0].password };
  const code = new Database(path.join(DATA_DIR, 'app.db'), { readonly: true }).prepare('select join_code c from classes where id=?').get(cls).c;
  cls = { id: cls, code };
  const page = await t1.req(`/admin/classes/${cls.id}`);
  check('班級頁顯示學生與班級代碼', page.status === 200 && page.text.includes('小熊') && page.text.includes(code));
  const row = new Database(path.join(DATA_DIR, 'app.db'), { readonly: true }).prepare("select id from users where nickname='小熊'").get();
  studentA.id = row.id;
}

section('老師之間的資料隔離');
{
  const e = await t2.req(`/api/classes/${cls.id}/export`);
  check('其他老師不能匯出我的班 (403)', e.status === 403);
  const add = await post(t2, `/api/classes/${cls.id}/students`, { nickname: 'hack' });
  check('其他老師不能加學生到我的班 (403)', add.status === 403);
  const rep = await t2.req(`/admin/students/${studentA.id}`);
  check('其他老師不能看我學生的報告頁', redir(rep));
  const csv = await t2.req(`/api/students/${studentA.id}/report`);
  check('其他老師不能下載我學生的明細 (403)', csv.status === 403);
  const rst = await patch(t2, `/api/students/${studentA.id}`, { action: 'reset_password' });
  check('其他老師不能重設我學生的密碼 (403)', rst.status === 403);
  const bind = await post(t2, `/api/students/${studentA.id}/bind-code`, {});
  check('其他老師不能產生綁定碼 (403)', bind.status === 403);
  const adminSees = await admin.req(`/admin/classes/${cls.id}`);
  check('管理員可看所有班級', adminSees.status === 200);
}

section('學生登入與限流');
const s1 = client(), s2 = client();
{
  const wrong = await post(client(), '/api/auth/student-login', { classCode: cls.code, nickname: '小熊', password: 'nope-nope' });
  check('錯誤密碼 401', wrong.status === 401);
  const wrongClass = await post(client(), '/api/auth/student-login', { classCode: 'ZZZZZZ', nickname: '小熊', password: 'x' });
  check('錯誤班級代碼與錯誤密碼訊息相同', wrongClass.json?.error === wrong.json?.error);
  const ok = await post(s1, '/api/auth/student-login', { classCode: cls.code.toLowerCase(), nickname: '小熊', password: studentA.pw });
  check('學生登入成功（班級代碼不分大小寫）', ok.json?.ok, JSON.stringify(ok.json));
  const ok2 = await post(s2, '/api/auth/student-login', { classCode: cls.code, nickname: '阿虎', password: studentB.pw });
  check('第二位學生登入', ok2.json?.ok);
  const victim = client(); let last;
  for (let i = 0; i < 9; i++) last = await post(victim, '/api/auth/student-login', { classCode: cls.code, nickname: '星星', password: 'wrong-' + i });
  check('連續錯 8 次後被限流 (429)', last.status === 429);
  const fine = await post(client(), '/api/auth/student-login', { classCode: cls.code, nickname: '小熊', password: studentA.pw });
  check('限流只影響被攻擊的帳號，其他同學照常登入', fine.json?.ok);
}

section('學生權限邊界');
{
  for (const [name, r] of [
    ['建立班級', await post(s1, '/api/classes', { name: 'x', grade: 1 })],
    ['廣播', await post(s1, '/api/broadcasts', { title: 'x', body: 'x', audience: { all: true } })],
    ['匯出班級', await s1.req(`/api/classes/${cls.id}/export`)],
    ['下載備份', await s1.req('/api/admin/backup')],
    ['改系統設定', await patch(s1, '/api/admin/settings', { orgName: 'x' })],
  ]) check(`學生不能${name} (403)`, r.status === 403, `got ${r.status}`);
  const adminPage = await s1.req('/admin');
  check('學生進 /admin 被導走', redir(adminPage));
  const other = await s1.req(`/api/students/${studentB.id ?? 'x'}/report`);
  check('學生不能下載別人的明細', other.status === 403 || other.status === 404);
  const own = await s1.req(`/api/students/${studentA.id}/report`);
  check('學生可下載自己的明細', own.status === 200 && (own.headers.get('content-type') ?? '').includes('text/csv'));
}

section('練習流程（伺服器批改）');
let attempt1;
{
  const start = await post(s1, '/api/learn/start', { unitId: 'm1-add20', count: 10 });
  check('開始練習', start.json?.ok && start.json.questions?.length === 10, JSON.stringify(start.json)?.slice(0, 200));
  check('start 回應不含答案或解釋', !/"answer"|"explain"|"accept"/.test(start.text));
  attempt1 = start.json;
  let correctCount = 0, wrongCount = 0, firstFb = null;
  for (let i = 0; i < attempt1.questions.length; i++) {
    const ans = solve(attempt1.questions[i].prompt);
    const wrong = ans === null;
    const r = await post(s1, '/api/learn/answer', { attemptId: attempt1.attemptId, idx: i, answer: wrong ? '999' : ans, timeMs: 1500 });
    if (!r.json?.ok) { check(`答題 ${i} 成功`, false, JSON.stringify(r.json)); continue; }
    firstFb ??= r.json;
    if (!wrong && r.json.correct) correctCount++;
    if (!wrong && !r.json.correct) check(`題目「${attempt1.questions[i].prompt}」用正確答案 ${ans} 卻被判錯`, false);
    if (wrong && !r.json.correct) wrongCount++;
  }
  check('正確答案全部被判對', correctCount > 0);
  check('答錯會回傳正確答案供學生學習', firstFb && 'answer' in firstFb);
  const twice = await post(s1, '/api/learn/answer', { attemptId: attempt1.attemptId, idx: 0, answer: '12345' });
  check('同一題不能改答案（重複提交回傳原結果）', twice.json?.repeated === true);
  const steal = await post(s2, '/api/learn/answer', { attemptId: attempt1.attemptId, idx: 1, answer: '1' });
  check('別人不能代答我的練習 (404)', steal.status === 404);
  const fin = await post(s1, '/api/learn/finish', { attemptId: attempt1.attemptId });
  check('完成練習並計算星星', fin.json?.ok && fin.json.correct === correctCount, JSON.stringify(fin.json));
  const lateAns = await post(s1, '/api/learn/answer', { attemptId: attempt1.attemptId, idx: 2, answer: '1' });
  check('完成後不能再答題 (409)', lateAns.status === 409 || lateAns.json?.repeated === true);
  const noUnit = await post(s1, '/api/learn/start', { unitId: 'nope' });
  check('不存在的單元 404', noUnit.status === 404);
  const m = new Database(path.join(DATA_DIR, 'app.db'), { readonly: true }).prepare('select count(*) n from mistakes where user_id=? and resolved_at is null').get(studentA.id).n;
  check('答錯的題目進入錯題本', m === wrongCount && m >= 0, `mistakes=${m} wrong=${wrongCount}`);
}

section('英文／中文內容包與錯題重做');
{
  const en = await post(s1, '/api/learn/start', { unitId: 'e2-be-verbs', count: 5 });
  check('英文內容包單元可練習', en.json?.ok && en.json.questions.length === 5 && en.json.questions.every((q) => q.type === 'choice' && q.choices.length >= 2));
  const zh = await post(s1, '/api/learn/start', { unitId: 'c1-measure-words', count: 5 });
  check('中文內容包單元可練習', zh.json?.ok);
  const redo = await post(s1, '/api/learn/redo', {});
  if (redo.json?.ok) {
    check('錯題重做產生練習', redo.json.questions.length >= 1);
  } else check('沒有錯題時回 404', redo.status === 404);
}

section('CSV 公式注入防護');
{
  let st, idx = -1;
  for (let k = 0; k < 8 && idx < 0; k++) {
    st = await post(s1, '/api/learn/start', { unitId: 'm6-ratio', count: 20 });
    idx = st.json.questions.findIndex((q) => q.type === 'text');
  }
  check('找到文字題', idx >= 0);
  if (idx >= 0) {
    await post(s1, '/api/learn/answer', { attemptId: st.json.attemptId, idx, answer: "=cmd|' /C calc'!A0" });
    const csv = await t1.req(`/api/students/${studentA.id}/report`);
    check('CSV 中以 = 開頭的學生輸入被中和', csv.text.includes("'=cmd") && !/(^|,)=cmd/m.test(csv.text), csv.text.slice(0, 200));
  }
}

section('功課、報告與班級統計');
{
  const a = await post(t1, `/api/classes/${cls.id}/assignments`, { unitId: 'm1-sub20', count: 5 });
  check('派發功課', a.json?.ok, JSON.stringify(a.json));
  const home = await s1.req('/learn');
  check('學生首頁顯示功課', home.status === 200 && home.text.includes('老師派的功課'));
  const asgId = new Database(path.join(DATA_DIR, 'app.db'), { readonly: true }).prepare('select id from assignments order by created_at limit 1').get().id;
  const other = await post(s2, '/api/learn/start', { unitId: 'm1-add20', assignmentId: asgId });
  check('單元與功課不符被拒', other.status === 400);
  const st = await post(s1, '/api/learn/start', { unitId: 'm1-sub20', assignmentId: asgId, count: 20 });
  check('功課題數由老師決定（忽略學生要求的題數）', st.json?.questions?.length === 5);
  for (let i = 0; i < 5; i++) await post(s1, '/api/learn/answer', { attemptId: st.json.attemptId, idx: i, answer: solve(st.json.questions[i].prompt) ?? '0' });
  await post(s1, '/api/learn/finish', { attemptId: st.json.attemptId });
  const pg = await t1.req(`/admin/classes/${cls.id}`);
  check('班級頁顯示功課完成人數', pg.text.includes('完成') && /完成\s*(<!-- -->)?1(<!-- -->)?\s*\/\s*(<!-- -->)?3/.test(pg.text), pg.text.match(/完成[^<]{0,30}/g)?.slice(0, 3).join('|'));
  const rep = await t1.req(`/admin/students/${studentA.id}`);
  check('學生報告頁可打開並顯示統計', rep.status === 200 && rep.text.includes('整體正確率') && rep.text.includes('知識點掌握'));
  const exp = await t1.req(`/api/classes/${cls.id}/export`);
  check('班級 CSV 匯出', exp.status === 200 && exp.text.includes('小熊') && exp.headers.get('content-type')?.includes('text/csv'));
  const dash = await t1.req('/admin');
  check('老師總覽有統計', dash.status === 200 && dash.text.includes('學生人數'));
  const adash = await admin.req('/admin');
  check('管理員總覽有全校統計', adash.status === 200 && adash.text.includes('本週正確率'));
}

section('家長綁定與權限');
const parent = client();
{
  const db = new Database(path.join(DATA_DIR, 'app.db'));
  db.prepare("insert into users (id, role, username, email, display_name, password_hash, status, email_verified_at, created_at) values (?,?,?,?,?,?,?,?,?)")
    .run(crypto.randomUUID(), 'parent', 'chan.mama', 'mama@example.com', '陳媽媽', await hash('Parent-pass-1'), 'active', Date.now(), Date.now());
  db.close();
  const l = await post(parent, '/api/auth/login', { identifier: 'chan.mama', password: 'Parent-pass-1' });
  check('家長登入', l.json?.ok);
  const before = await parent.req(`/api/students/${studentA.id}/report`);
  check('未綁定前家長不能看孩子資料 (403)', before.status === 403);
  const badBind = await post(parent, '/api/parent/bind', { code: 'AAAA-BBBB' });
  check('錯誤綁定碼被拒', badBind.status === 400);
  const code = (await post(t1, `/api/students/${studentA.id}/bind-code`, {})).json?.code;
  check('老師產生綁定碼', /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code ?? ''));
  const good = await post(parent, '/api/parent/bind', { code });
  check('家長綁定成功', good.json?.ok);
  const reuse = await post(client(), '/api/parent/bind', { code });
  check('綁定碼不能重用（且非家長不能綁定）', reuse.status === 401 || reuse.status === 403);
  const home = await parent.req('/parent');
  check('家長首頁顯示孩子', home.status === 200 && home.text.includes('小熊'));
  const rep = await parent.req(`/parent/child/${studentA.id}`);
  check('家長可看孩子報告', rep.status === 200 && rep.text.includes('整體正確率'));
  const other = await parent.req(`/api/students/${studentB.id ?? 'zzz'}/report`);
  check('家長不能看沒有綁定的學生', other.status === 403 || other.status === 404);
  const staff = await post(parent, '/api/classes', { name: 'x', grade: 1 });
  check('家長不能使用老師功能 (403)', staff.status === 403);
}

section('廣播');
{
  const bc = await post(t1, '/api/broadcasts', { title: '明日帶畫簿', body: '請同學明日帶畫簿回校。', audience: { classIds: [cls.id] }, sendEmail: false, pinned: true });
  check('老師向自己的班廣播', bc.json?.ok && bc.json.recipients >= 3, JSON.stringify(bc.json));
  const wrong = await post(t1, '/api/broadcasts', { title: 'x', body: 'x', audience: { classIds: [cls2] } });
  check('老師不能向別人的班廣播', wrong.status === 400);
  const all = await post(t1, '/api/broadcasts', { title: 'x', body: 'x', audience: { all: true } });
  check('老師不能向全校廣播（只限自己的班）', all.json?.ok !== true || all.json.recipients <= 4);
  const home = await s1.req('/learn');
  check('學生看到通知', home.text.includes('明日帶畫簿'));
  const ph = await parent.req('/parent');
  check('已綁定的家長也收到', ph.text.includes('明日帶畫簿'));
  const other = await s2.req('/learn');
  check('其他班的學生沒有收到', !(await (await client().req('/')).text).includes('明日帶畫簿'));
  const ids = new Database(path.join(DATA_DIR, 'app.db'), { readonly: true }).prepare('select id from broadcasts order by created_at limit 1').get();
  await post(s1, '/api/notices/read', { ids: [ids.id] });
  const after = await s1.req('/learn');
  check('標為已讀後不再顯示', !after.text.includes('明日帶畫簿'));
  const adm = await post(admin, '/api/broadcasts', { title: '全校通知', body: 'hello', audience: { all: true }, sendEmail: true });
  check('管理員全校廣播（郵件未啟用時只發站內）', adm.json?.ok && adm.json.emailsQueued === 0, JSON.stringify(adm.json));
}

section('題庫、教學與內容包');
const SMOKE_PACK = (name, unitId, license, extra = {}) => ({
  pack: name, version: 1, license, source: 'https://example.org/dataset',
  units: [{ id: unitId, subject: 'general', grade: 3, title: '煙霧測試單元', intro: ['這是測試用的講解。'], questions: Array.from({ length: 8 }, (_, i) => ({ type: 'choice', prompt: `測試題 ${i + 1}：1 + ${i} = ?`, choices: [String(1 + i), String(2 + i), String(3 + i), String(4 + i)], answer: String(1 + i), explain: '測試解釋', tag: 'smoke' })) }],
  ...extra,
});
const up = (c, obj) => c.req('/api/admin/content', { method: 'POST', body: typeof obj === 'string' ? obj : JSON.stringify(obj), rawBody: true, headers: { 'content-type': 'application/json' } });
{
  check('老師不能上傳內容包 (403)', (await up(t1, SMOKE_PACK('smoke-pack', 'x-smoke-unit', 'CC0-1.0'))).status === 403);
  check('學生不能上傳內容包 (403)', (await up(s1, SMOKE_PACK('smoke-pack', 'x-smoke-unit', 'CC0-1.0'))).status === 403);
  check('老師看不到題庫管理頁', redir(await t1.req('/admin/content')));
  const bad = [
    ['不是 JSON', 'this is not json', /JSON/],
    ['缺少授權', (() => { const p = SMOKE_PACK('smoke-nolic', 'x-nolic', 'x'); delete p.license; return p; })(), /license|格式/],
    ['非商業授權 CC BY-NC', SMOKE_PACK('smoke-nc', 'x-nc', 'CC-BY-NC-4.0'), /不被接受/],
    ['禁止改作 CC BY-ND', SMOKE_PACK('smoke-nd', 'x-nd', 'CC BY-ND 4.0'), /不被接受/],
    ['GPL 不在白名單', SMOKE_PACK('smoke-gpl', 'x-gpl', 'GPL-3.0'), /不被接受/],
    ['單元 ID 與內建衝突', SMOKE_PACK('smoke-clash', 'm1-add20', 'CC0-1.0'), /已被使用/],
    ['答案不在選項內', (() => { const p = SMOKE_PACK('smoke-ans', 'x-ans', 'CC0-1.0'); p.units[0].questions[0].answer = '不存在'; return p; })(), /格式有誤/],
    ['選項重複', (() => { const p = SMOKE_PACK('smoke-dupc', 'x-dupc', 'CC0-1.0'); p.units[0].questions[0].choices = ['1', '1', '2', '3']; return p; })(), /格式有誤/],
    ['單元 ID 含大寫／空格', SMOKE_PACK('smoke-id', 'Bad ID', 'CC0-1.0'), /格式有誤/],
    ['年級超出範圍', (() => { const p = SMOKE_PACK('smoke-grade', 'x-grade', 'CC0-1.0'); p.units[0].grade = 9; return p; })(), /格式有誤/],
  ];
  for (const [name, body, re] of bad) {
    const r = await up(admin, body);
    check(`拒絕：${name}`, r.status >= 400 && r.status < 500 && re.test(r.json?.error ?? ''), `${r.status} ${JSON.stringify(r.json)}`);
  }
  const ok1 = await up(admin, SMOKE_PACK('smoke-pack', 'x-smoke-unit', 'CC0-1.0'));
  check('上傳有效的內容包', ok1.json?.ok && ok1.json.units === 1 && ok1.json.questions === 8, JSON.stringify(ok1.json));
  check('同名內容包 409', (await up(admin, SMOKE_PACK('smoke-pack', 'x-other', 'CC0-1.0'))).status === 409);
  const ok2 = await up(admin, SMOKE_PACK('smoke-pack-2', 'x-smoke-unit-2', 'CC BY-SA 4.0'));
  check('授權寫法有空格也能認出（CC BY-SA 4.0）', ok2.json?.ok, JSON.stringify(ok2.json));

  const home = await s1.req('/learn?s=general&g=3');
  check('學生馬上看到新單元', home.status === 200 && home.text.includes('煙霧測試單元'));
  const st = await post(s1, '/api/learn/start', { unitId: 'x-smoke-unit', count: 5 });
  check('可以練習上傳的單元，且不洩漏答案', st.json?.ok && st.json.questions.length === 5 && !/"answer"|"explain"/.test(st.text), JSON.stringify(st.json)?.slice(0, 120));
  const pg = await s1.req('/learn/unit/x-smoke-unit');
  check('單元頁標明題目來源與授權', pg.status === 200 && pg.text.includes('smoke-pack') && pg.text.includes('CC0-1.0'));
  check('單元頁有「先學一學」與「看看例題」', pg.text.includes('先學一學') === false || pg.text.includes('看看例題'));
  const lesson = await s1.req('/learn/unit/m4-fraction');
  check('教學頁：重點、常見錯誤、例題都有', lesson.status === 200 && lesson.text.includes('先學一學') && lesson.text.includes('常見錯誤') && lesson.text.includes('看看例題') && lesson.text.includes('答案：'));
  const lesson2 = await s1.req('/learn/unit/g1-health');
  check('常識科教學頁', lesson2.status === 200 && lesson2.text.includes('先學一學') && lesson2.text.includes('洗手'));

  const dis = await patch(admin, '/api/admin/content/smoke-pack', { enabled: false });
  check('停用內容包', dis.json?.ok);
  check('停用後學生不能再練習該單元 (404)', (await post(s1, '/api/learn/start', { unitId: 'x-smoke-unit', count: 5 })).status === 404);
  await patch(admin, '/api/admin/content/smoke-pack', { enabled: true });
  check('重新啟用後可練習', (await post(s1, '/api/learn/start', { unitId: 'x-smoke-unit', count: 5 })).json?.ok === true);
  const dlp = await admin.req('/api/admin/content/smoke-pack');
  check('可下載已上傳的內容包', dlp.status === 200 && JSON.parse(dlp.text).pack === 'smoke-pack');
  const page = await admin.req('/admin/content');
  check('題庫管理頁列出內容包、授權與各年級單元數', page.status === 200 && page.text.includes('smoke-pack') && page.text.includes('CC0-1.0') && page.text.includes('目前共'));
  check('刪除內容包', (await admin.req('/api/admin/content/smoke-pack-2', { method: 'DELETE' })).json?.ok);

  // CSV 轉內容包工具 → 上傳 → 練習
  const csvFile = path.join(DATA_DIR, 'smoke.csv');
  fs.writeFileSync(csvFile, 'prompt,answer,wrong1,wrong2,wrong3,explain,tag\n"Which is a fruit, a vegetable or a tool?",apple,hammer,table,pencil,"An apple is a fruit.",s-csv\nSpell the colour of the sky: ___,blue,,,,"The sky is blue.",s-csv\n');
  const conv = spawnSync('node', ['scripts/import-pack.mjs', csvFile, '--pack', 'smoke-csv', '--unit-id', 'x-csv-unit', '--subject', 'english', '--grade', '2', '--title', 'CSV 測試', '--license', 'CC0-1.0', '--source', 'https://example.org/csv'], { encoding: 'utf8' });
  check('CSV 轉換工具成功（含引號與逗號、單選與文字題）', conv.status === 0, conv.stderr);
  const packFromCsv = JSON.parse(conv.stdout || '{}');
  check('轉換結果：1 題單選＋1 題文字，答案正確', packFromCsv.units?.[0]?.questions?.length === 2 && packFromCsv.units[0].questions[0].type === 'choice' && packFromCsv.units[0].questions[1].type === 'text' && packFromCsv.units[0].questions[0].prompt.includes('fruit, a vegetable'));
  const upCsv = await up(admin, conv.stdout);
  check('轉換結果可直接上傳', upCsv.json?.ok, JSON.stringify(upCsv.json));
  const stCsv = await post(s1, '/api/learn/start', { unitId: 'x-csv-unit', count: 5 });
  check('CSV 單元可練習', stCsv.json?.ok && stCsv.json.questions.length === 2);
  fs.writeFileSync(csvFile, 'prompt,answer,wrong1,wrong2\nQ?,a,a,b\n');
  const badConv = spawnSync('node', ['scripts/import-pack.mjs', csvFile, '--pack', 'smoke-bad', '--unit-id', 'x-bad', '--subject', 'english', '--grade', '2', '--title', 't', '--license', 'CC0-1.0'], { encoding: 'utf8' });
  check('CSV 工具拒絕重複選項', badConv.status === 1 && /重複/.test(badConv.stderr));
  fs.writeFileSync(csvFile, 'prompt,answer,wrong1\nQ?,a,b\n');
  const noLic = spawnSync('node', ['scripts/import-pack.mjs', csvFile, '--pack', 'x', '--unit-id', 'x', '--subject', 'english', '--grade', '2', '--title', 't'], { encoding: 'utf8' });
  check('CSV 工具要求註明授權', noLic.status !== 0 && /license/.test(noLic.stderr));
  fs.rmSync(csvFile, { force: true });

  // 掃描所有單元：每個單元都能透過 HTTP 開始練習
  const ids = new Set();
  for (const sub of ['math', 'english', 'chinese', 'general']) for (let g = 1; g <= 6; g++) {
    const h = await s1.req(`/learn?s=${sub}&g=${g}`);
    for (const m of h.text.matchAll(/\/learn\/unit\/([a-z0-9-]+)/g)) ids.add(m[1]);
  }
  let okUnits = 0, badUnits = [];
  for (const id of ids) {
    const r = await post(s1, '/api/learn/start', { unitId: id, count: 5 });
    if (r.json?.ok && r.json.questions.length >= 1 && !/"answer"/.test(r.text)) okUnits++; else badUnits.push(id);
    const lp = await s1.req(`/learn/unit/${id}`);
    if (lp.status !== 200 || !lp.text.includes('開始練習')) badUnits.push(id + '(頁面)');
  }
  check(`全部 ${ids.size} 個單元都能開始練習、頁面正常、不洩漏答案`, ids.size >= 95 && badUnits.length === 0, `ok=${okUnits} bad=${badUnits.join(',')}`);
  console.log(`  ℹ 共 ${ids.size} 個單元`);
}

section('註冊（郵件未啟用）、備份、停用與刪除');
{
  const reg = await post(client(), '/api/auth/register', { role: 'teacher', username: 'newbie', email: 'n@example.com', displayName: 'N', password: 'Some-password-1' });
  check('郵件未啟用時不能自行註冊 (503)', reg.status === 503);
  const bk = await admin.req('/api/admin/backup');
  check('管理員可下載資料庫備份（有效 SQLite 檔）', bk.status === 200 && bk.text.startsWith('SQLite format 3'));
  const dis = await patch(t1, `/api/students/${studentB.id ?? 'x'}`, { action: 'disable' });
  const bId = new Database(path.join(DATA_DIR, 'app.db'), { readonly: true }).prepare("select id from users where nickname='阿虎'").get().id;
  const d2 = await patch(t1, `/api/students/${bId}`, { action: 'disable' });
  check('停用學生', d2.json?.ok);
  const blocked = await post(client(), '/api/auth/student-login', { classCode: cls.code, nickname: '阿虎', password: studentB.pw });
  check('停用後不能登入 (403)', blocked.status === 403);
  const kicked = await s2.req('/learn');
  check('停用後已登入的裝置立即失效', redir(kicked));
  const rs = await patch(t1, `/api/students/${studentA.id}`, { action: 'reset_password' });
  check('重設密碼回傳新密碼', rs.json?.password?.length >= 8);
  const old = await s1.req('/learn');
  check('重設密碼後舊會話失效', redir(old));
  const oldPw = await post(client(), '/api/auth/student-login', { classCode: cls.code, nickname: '小熊', password: studentA.pw });
  check('舊密碼不能再用', oldPw.status === 401);
  const del = await t1.req(`/api/students/${studentA.id}`, { method: 'DELETE' });
  check('徹底刪除學生', del.json?.ok);
  const db = new Database(path.join(DATA_DIR, 'app.db'), { readonly: true });
  const left = ['attempts', 'attempt_answers', 'mistakes', 'broadcast_receipts', 'parent_links', 'sessions'].map((t) => db.prepare(`select count(*) n from ${t} where ${t === 'parent_links' ? 'student_id' : 'user_id'}=?`).get(studentA.id).n);
  check('刪除後該學生所有學習資料一併清除', left.every((n) => n === 0), JSON.stringify(left));
  const aud = db.prepare("select count(*) n from audit_logs where action in ('student.delete','student.reset_password','login.fail','class.create')").get().n;
  check('敏感操作寫入審計日誌', aud >= 4);
  const audPage = await admin.req('/admin/audit');
  check('管理員可看審計日誌', audPage.status === 200 && audPage.text.includes('student.delete'));
  const anon = await client().req('/learn');
  check('未登入訪問 /learn 導向登入（不是 500）', redir(anon) && (anon.location ?? '').includes('/login'), `status ${anon.status}`);
  for (const u of ['/admin', '/admin/classes', '/parent', '/learn/mistakes']) { const r = await client().req(u); check(`未登入訪問 ${u} 導向登入`, redir(r) && (r.location ?? '').includes('/login'), `status ${r.status}`); }
}


section('備份匯出、匯入與還原');
{
  const dbp = path.join(DATA_DIR, 'app.db');
  const q = (sql, ...a) => { const d = new Database(dbp, { readonly: true }); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
  const upload = (c, buf) => c.req('/api/admin/restore/stage', { method: 'POST', body: buf, rawBody: true, headers: { 'content-type': 'application/octet-stream' } });
  const mutate = (buf, fn) => { const f = path.join(DATA_DIR, `tmp-mutate-${Date.now()}.db`); fs.writeFileSync(f, buf); const d = new Database(f); try { fn(d); } finally { d.close(); } const out = fs.readFileSync(f); for (const e of ['', '-wal', '-shm']) fs.rmSync(f + e, { force: true }); return out; };

  const mkS = await post(t1, `/api/classes/${cls.id}/students`, { nickname: '還原生' });
  const s3 = client();
  await post(s3, '/api/auth/student-login', { classCode: cls.code, nickname: '還原生', password: mkS.json.created[0].password });
  check('（備份前）建立一位有登入狀態的學生', (await s3.req('/learn')).status === 200);
  const dl = await admin.req('/api/admin/backup', { binary: true });
  check('匯出：下載到有效的 SQLite 檔', dl.status === 200 && dl.buf.subarray(0, 15).toString() === 'SQLite format 3');
  const snapshot = dl.buf;
  const classesBefore = q('select count(*) n from classes').n;
  const studentsBefore = q("select count(*) n from users where role='student' and status!='disabled'").n;

  // 備份之後才發生的變化 —— 還原後應該消失
  const mk = await post(t1, '/api/classes', { name: '還原測試班', grade: 2 });
  check('（備份之後）新增一個班級作為標記', mk.json?.ok);
  const late = await up(admin, SMOKE_PACK('smoke-late', 'x-late-unit', 'MIT'));
  check('（備份之後）再上傳一個內容包', late.json?.ok);
  check('（備份之後）新內容包的單元可練習', (await post(s3, '/api/learn/start', { unitId: 'x-late-unit', count: 5 })).json?.ok === true);
  check('標記班級存在', q("select count(*) n from classes where name='還原測試班'").n === 1);

  check('老師不能匯出備份 (403)', (await t1.req('/api/admin/backup')).status === 403);
  check('老師不能上傳還原 (403)', (await upload(t1, snapshot)).status === 403);
  check('老師不能套用還原 (403)', (await post(t1, '/api/admin/restore/apply', { password: 'x', confirm: '還原' })).status === 403);
  check('老師看不到備份頁', redir(await t1.req('/admin/backup')));

  const bad = await upload(admin, Buffer.from('this is definitely not a database '.repeat(50)));
  check('亂碼檔被拒', bad.status === 400 && /SQLite/.test(bad.json?.error ?? ''), JSON.stringify(bad.json));
  const trig = await upload(admin, mutate(snapshot, (d) => d.exec("create trigger evil after insert on audit_logs begin delete from users; end;")));
  check('含觸發器的資料庫被拒', trig.status === 400 && /觸發器/.test(trig.json?.error ?? ''), JSON.stringify(trig.json));
  const unk = await upload(admin, mutate(snapshot, (d) => d.exec('create table sneaky (x text)')));
  check('含不明資料表的資料庫被拒', unk.status === 400 && /不認識/.test(unk.json?.error ?? ''), JSON.stringify(unk.json));
  const newer = await upload(admin, mutate(snapshot, (d) => { for (let i = 0; i < 5; i++) d.prepare('insert into __drizzle_migrations (hash, created_at) values (?, ?)').run('future' + i, Date.now() + i); }));
  check('來自較新版本的備份被拒', newer.status === 400 && /較新版本/.test(newer.json?.error ?? ''), JSON.stringify(newer.json));
  const noAdmin = await upload(admin, mutate(snapshot, (d) => d.exec("update users set role='teacher' where role='admin'")));
  check('沒有管理員的備份被拒（避免還原後無法登入）', noAdmin.status === 400 && /管理員/.test(noAdmin.json?.error ?? ''), JSON.stringify(noAdmin.json));
  const corrupt = Buffer.from(snapshot); corrupt.fill(0xab, Math.floor(corrupt.length / 2), Math.floor(corrupt.length / 2) + 4096);
  const cr = await upload(admin, corrupt);
  check('損毀的資料庫被拒', cr.status === 400, JSON.stringify(cr.json));
  check('以上被拒絕的嘗試都沒有改動現有資料', q("select count(*) n from classes where name='還原測試班'").n === 1);

  const noStage = await post(admin, '/api/admin/restore/apply', { password: 'Correct-horse-9', confirm: '還原' });
  check('沒有暫存備份時不能套用 (400)', noStage.status === 400);

  const ok1 = await upload(admin, snapshot);
  check('有效備份通過檢查並回報內容摘要（班級、學生數與備份當時一致）', ok1.json?.ok === true && ok1.json.info.students === studentsBefore && ok1.json.info.classes === classesBefore && ok1.json.info.admins === 1, JSON.stringify(ok1.json));
  check('檢查階段不會改動現有資料', q("select count(*) n from classes where name='還原測試班'").n === 1);
  const wrongPw = await post(admin, '/api/admin/restore/apply', { password: 'wrong-password', confirm: '還原' });
  check('密碼錯誤不能還原 (403)', wrongPw.status === 403);
  const wrongConfirm = await post(admin, '/api/admin/restore/apply', { password: 'Correct-horse-9', confirm: '確認' });
  check('沒輸入「還原」二字不能還原 (400)', wrongConfirm.status === 400);
  check('以上失敗的嘗試都沒有改動現有資料', q("select count(*) n from classes where name='還原測試班'").n === 1);

  const apply = await post(admin, '/api/admin/restore/apply', { password: 'Correct-horse-9', confirm: '還原' });
  check('套用還原成功並建議重新登入', apply.json?.ok && apply.json.relogin === true && /^pre-restore-/.test(apply.json.safety ?? ''), JSON.stringify(apply.json));
  check('還原後：備份之後建立的標記班級消失', q("select count(*) n from classes where name='還原測試班'").n === 0);
  check('還原後：班級數回到備份當時，學生資料都在', q('select count(*) n from classes').n === classesBefore && q("select count(*) n from users where role='student' and status!='disabled'").n === studentsBefore);
  check('還原前自動留下安全備份', fs.existsSync(path.join(DATA_DIR, 'backups', apply.json.safety)));
  check('還原後服務仍健康', (await get('/api/healthz')).status === 200);
  check('還原後：備份當時已上傳的內容包仍在（內容包存在資料庫，隨備份還原）', (await post(s3, '/api/learn/start', { unitId: 'x-smoke-unit', count: 5 })).json?.ok === true);
  check('還原後：備份之後才上傳的內容包消失，題庫已重新載入', (await post(s3, '/api/learn/start', { unitId: 'x-late-unit', count: 5 })).status === 404);
  check('還原後：備份前的登入狀態仍有效（工作階段在備份內）', (await s3.req('/learn')).status === 200);
  const again = client();
  const relog = await post(again, '/api/auth/login', { identifier: 'boss', password: 'Correct-horse-9' });
  check('還原後管理員可重新登入', relog.json?.ok);
  const aud = q("select count(*) n from audit_logs where action='backup.restore'").n;
  check('還原動作寫入（還原後的）審計日誌', aud === 1);
  check('暫存檔已清除', !fs.existsSync(path.join(DATA_DIR, 'restore-staged.db')));

  // 用「還原前的安全備份」再還原一次 → 標記班級應該回來（證明可以反悔）
  const back = await post(again, '/api/admin/restore/stage', { name: apply.json.safety });
  check('可從伺服器上的安全備份選擇還原', back.json?.ok, JSON.stringify(back.json));
  const apply2 = await post(again, '/api/admin/restore/apply', { password: 'Correct-horse-9', confirm: '還原' });
  check('反悔：還原到「還原前」的狀態', apply2.json?.ok && q("select count(*) n from classes where name='還原測試班'").n === 1, JSON.stringify(apply2.json));

  const strays = fs.readdirSync(DATA_DIR).filter((n) => /^restore-staged|\.upload|-wal$|-shm$/.test(n) && !/^app\.db-(wal|shm)$/.test(n));
  check('還原流程不留下暫存檔或 WAL 殘留', strays.length === 0, strays.join(','));
  const bdir = fs.readdirSync(path.join(DATA_DIR, 'backups')).filter((n) => !/^(app|manual|pre-restore)-[\d-]+\.db$/.test(n));
  check('備份資料夾內沒有 -wal／-shm 殘留', bdir.length === 0, bdir.join(','));

  // 檔名白名單 / 路徑穿越
  const adm2 = client(); await post(adm2, '/api/auth/login', { identifier: 'boss', password: 'Correct-horse-9' });
  for (const n of ['../../etc/passwd', 'app.db', '..%2f..%2fapp.db', 'app-2026-01-01.db/../../app.db']) {
    const r = await adm2.req('/api/admin/backup?name=' + n);
    check(`下載備份檔名白名單：拒絕 ${n}`, r.status === 404 || r.status === 400);
  }
  const mkb = await post(adm2, '/api/admin/backup/create', {});
  check('在伺服器上建立手動備份', mkb.json?.ok && /^manual-/.test(mkb.json.name) && fs.existsSync(path.join(DATA_DIR, 'backups', mkb.json.name)));
  const page = await adm2.req('/admin/backup');
  check('備份頁列出備份', page.status === 200 && page.text.includes(mkb.json.name) && page.text.includes('匯入並還原'));
  const dlStored = await adm2.req('/api/admin/backup?name=' + mkb.json.name, { binary: true });
  check('可下載伺服器上的備份', dlStored.status === 200 && dlStored.buf.subarray(0, 15).toString() === 'SQLite format 3');
}

console.log(`\n${passed} 通過，${failed} 失敗`);
process.exit(failed ? 1 : 0);
