# 變更記錄

## 未發佈（部署後用戶回報修復）

- **雙語切換真正生效**：新增 `lib/serverI18n.ts`（cookie `hkpl-locale` 驅動的伺服器端翻譯）；三個 layout 導覽（後台選單／學生「錯題本」／家長「更改密碼」）、登出按鈕、學生首頁（問候、連續日數、今日複習卡、功課卡、科目／年級標籤、單元卡）全部接入 `t()`；`LocaleSwitch` 切換後 `router.refresh()` 重渲伺服器內容。頁面內文仍是繁中（部分雙語）。
- **逐題編輯可發現性**：內容包列表「操作」欄加「查看題目／編輯」連結；詳情頁對目錄包顯示「目錄包不可網上編輯」提示（原先操作欄空白，易誤解為壞了）。逐題編輯仍只適用於資料庫上傳的內容包。
- **從題庫生成試卷**：新增 `POST /api/papers/generate`＋後台「從題庫生成試卷」表單——選科目／年級／來源（內建題庫＝無上限新題；內容包＝受限於包內題數），自動抽題組成固定卷面，一律「待審核」；授權隨來源繼承（內建＝原創，內容包須為系統接受的開放授權，混合授權會被拒）。`papers.kind` 新增 `generated`（純列舉擴充，無 schema 變更）。`lib/papers.ts` 新增 `pickPaperQuestions()`（靜態題庫先抽、參數化生成補足、題面去重、選項洗牌）。
- **範本加題**：原創範本 3→6 題、開放授權範本 1→5 題（先前開放授權範本只有 1 題，易被誤以為「試卷只有一題」）。
- 新增 4 個測試案例（223 全過）：抽題數量上限／去重／unit 來源、生成補足、選項洗牌後仍含答案且可批改、生成卷合規。

## 未發佈（本輪一次做完：A1–A6、B1–B5、C1–C3、非功能項）

> 分支 `feat/admin-learner-upgrades`，基於已合併的 PR #1（288 道原創題目已在 `main`）。
> 驗證：`npm run typecheck` 無錯、`npm test` **6 檔 219 個測試全過**（原 203）、`npm run build` 成功（所有新頁面／API 都編譯）、HTTP 端到端煙霧測試 **188 項通過、0 失敗**（本機 Windows 需以 `cp -rL` 複製 standalone 的符號連結；CI 在 Linux 直接跑）。

### 資料庫（共用基座）

- `apps/web/drizzle/0003_admin_learner_upgrades.sql` + `meta/0003_snapshot.json`：新增 `papers`、`srsCards`、`badges`、`invites`、`totpSecrets` 5 張表；`assignments` 加 `mode`／`paperId`／`timeLimitMin`／`pointsPerQuestion`；`contentPacks` 加 `licenseUrl`／`sourceUrl`／`retrievedAt`／`adaptationNote`／`reviewedAt`／`reviewedBy`／`reviewSample`。
- **全部是 `CREATE TABLE` / `ADD COLUMN` / `CREATE INDEX`，不刪改既有欄位、不搬資料**；升級時既有 SQLite 可直接沿用。

### A. 管理後台

| 項目 | 主要檔案 | 內容 |
|---|---|---|
| A1 上傳前預覽＋兩步確認 | `app/api/admin/content/validate/route.ts`、`app/admin/content/PackTools.tsx` | 先解析並顯示 4×6 落格、題數、授權、unit id 衝突，按「確認上傳」才 POST |
| A2 內容包詳情／逐題瀏覽 | `app/admin/content/[name]/page.tsx`、`DetailTools.tsx` | 展開 `unit → 題目`（題面／選項／答案／解釋／tag），目錄包與 DB 包都可看，僅 admin |
| A3 逐題編輯 | `app/api/admin/content/[name]/question/route.ts` | PATCH 單題、寫 `auditLogs`；只對 DB 上傳包有效 |
| A4 衝突醒目提示 | `app/admin/content/page.tsx` | 矩陣上方列出重複 unit id，並可直接停用衝突的上傳包 |
| A5 授權與來源治理 | `lib/content/types.ts`、`lib/content/registry.ts`、`app/api/admin/content/route.ts`、`app/learn/unit/[id]/page.tsx` | 授權條文連結／原始來源／取用日期／改編說明進 DB 並顯示在學生端；支援逐題 `source` |
| A6 人工抽檢覆核 | `app/api/admin/content/[name]/review/route.ts`、`DetailTools.tsx` | 抽 5 題試做、標記「已人工覆核」，後台列表顯示未覆核狀態 |

### B. 學生／老師／家長

- **B1 間隔重複（SRS）**：`lib/srs.ts`（SM-2：`schedule()`，`ease` 限 130–300、答錯重置並記 lapses）、`app/api/learn/review/route.ts`、`app/learn/review/page.tsx`；`POST /api/learn/answer` 批改後建立／更新錯題卡。
- **B2 學習熱圖**：`lib/stats.ts` 加 4 科 × P1–P6 正確率統計、`app/learn/heatmap/page.tsx`。
- **B3 固定卷面功課**：`app/api/classes/[id]/assignments/route.ts`、`admin/classes/[id]/ClassTools.tsx`、`components/PracticeRunner.tsx`、`app/learn/page.tsx`；固定題序、時限倒數、按分計分、`assignmentId` 串回 `attempts`。
- **B4 PWA**：`app/manifest.ts`、`public/icon.svg`、`public/sw.js`（靜態 cache-first、頁面 network-first，**`/api/` 與含答案回應不快取**）、`components/ServiceWorker.tsx`（僅 production 註冊）、根 `layout.tsx`。
- **B4 徽章**：`lib/badges.ts`（5 種：`first-practice`／`perfect-10`／`streak-7`／`century`／`clean-slate`，`onConflictDoNothing`）、`POST /api/learn/finish` 串接、`app/learn/badges/page.tsx`；學生首頁納入口。
- **B4 雙語（部分）**：`lib/i18n.ts`、`components/LocaleSwitch.tsx`（localStorage + cookie、模組級訂閱、`t()`／`useLocale()`）、根 `layout.tsx`。**僅覆蓋共用字串，非全站雙語**（詳見 README「雙語介面覆蓋範圍」）。
- **B5 家長只讀週報**：`app/api/parent/report/route.ts`、`app/parent/page.tsx`；只讀摘要，不能改答案。

### C. 試卷、題庫、部署文件

- **C1 試卷（三種方案一次做齊）**：`lib/papers.ts`（schema、`assertPaperCompliance()`、`safePaper()`、`visiblePapers()`、`startPaperAttempt()`）、4 支 API（`api/papers/route.ts`、`[id]/route.ts`、`[id]/review/route.ts`、`[id]/start/route.ts`）、`app/admin/papers/`、`app/learn/papers/`。
  - 合規閘只接受①教師原創卷（原創聲明）②明確開放授權卷（須 `license`＋`licenseUrl`＋`retrievedAt`）③只存外連、不存題目的索引卷；**NC／ND／無授權、課本／TSA／補習社／商業試卷一律拒絕**。
  - `safePaper()` 不把含答案的 `questions` 傳給前端；學生只看到 `approved` 且公開／所屬班級的卷；開卷固定題序、沿用 `/api/learn/answer` 與 `/api/learn/finish`。
- **C2 參數化數學**：`lib/content/math.ts` 新增 6 個 `mx-pN-*` 單元（P1–P6 各一），以 `gens` 即時出題、自帶 `lesson`，難度對齊既有內建分級；原 288 道靜態題保留。
- **C3 部署文件**：`docs/deployment.md` 新增「用 Dockge／Portainer 等面板部署」：釐清 Compose project name／service 名／stack 目錄名、解釋 `UNKNOWN` 誤判、給出「改目錄名」的安全解法、為何不能改 `name:`（volume 會換、資料看似清空）、以及「Update 不會重啟」的升級注意事項。

### D. 非功能與既有缺失修復

- **TOTP 二步驗證**：`lib/totp.ts`（base32、HMAC-SHA1、±1 時間窗、otpauth URL）、`app/api/account/totp/route.ts`、`app/account/totp/page.tsx`、`app/api/auth/login/route.ts`（`totp_required` 第二段）、`app/login/page.tsx`；驗證限流與審計。
- **資料保留**：`lib/retention.ts`（預覽與執行條件一致、單一 transaction 回滾；只清 `attempts`／`attemptAnswers`／`emailLogs`／`auditLogs`，帳號／錯題／題庫不刪）、`app/api/admin/retention/route.ts`、`admin/settings/SettingsForm.tsx`。**目前由管理員手動執行，沒有排程**。
- **郵件模板編輯**：`lib/mail/templates.ts` 讀 `settings` 覆寫，`app/api/admin/mail/route.ts`、`admin/settings/mail/MailSettings.tsx`。
- **老師邀請連結**：`app/api/admin/invites/route.ts`（限次／限時、code hash）、`app/invite/[code]/page.tsx`、`admin/people/PeopleTools.tsx`。
- **發版**：`.github/workflows/release.yml` 改為僅 `workflow_dispatch`，結束 `v*.*.*` tag 與 `ci.yml` 重複發版；`ci.yml` 未動。
- **鏡像名與路徑**：`README.md`、`README.en.md`、`.env.example`、`deploy/docker-compose.yml`、`docker/Dockerfile`、`docs/deployment.md` 統一為 `qzqmn/primary-learn`／`ghcr.io/qzqmn/primary-learn`，移除 `OWNER` 佔位符；`deploy/docker-compose.yml` 頂層 `name: hk-primary-learn` **刻意保留**（改動會換 volume）。
- **CSP**：`next.config.mjs` 移除 `'unsafe-eval'`，加入 `object-src 'none'`、`base-uri 'self'`、`frame-ancestors 'none'`；`'unsafe-inline'` 仍需 nonce 化才能移除。
- **測試**：新增 `src/lib/__tests__/upgrades.test.ts`（16 案例）：SRS 排程上下限與重置、TOTP 產生／驗證／過期、試卷合規閘（NC/ND、開放授權必填、索引卷不得存題目、課本/TSA 拒絕）、序列化題序與答案、徽章定義、6 個參數化數學單元在大量隨機種子下標準答案都被 `isCorrect()` 判對。

### 已知限制（誠實保留）

- 全站雙語、嚴格 CSP（`script-src 'unsafe-inline'`）、粵拼／拼音、瀏覽器推送、AI 出題、閱讀理解長文題仍未做。
- 逐題編輯只對 DB 上傳包有效；目錄包（`content/`）仍須改檔重部署。資料保留為手動、無 cron。
- 試卷合規閘是**程式規則不是法律保證**，授權真偽仍須人工查證；公開卷須先審核。
- 目錄包與後台上傳同一份 JSON 會造成 unit id 撞車，只能二選一。
- 本輪已通過型別檢查、219 個單元測試、正式建置與 HTTP 煙霧測試，但 TOTP／郵件／PWA 安裝／試卷審核／Docker 升級仍須在正式環境實測；專案未經獨立安全審計。

## v0.2.3

`apps/web/package.json` 目前標記的版本。本輪**之前**的既有功能：

- 練習流程、即時批改、錯題本、星星與連續練習日數、單元進度、學生／班級報告與 CSV 匯出。
- 老師／家長／管理員後台：班級與學生、功課（隨機抽題）、廣播、備份匯出與匯入還原、內容包上傳／啟停／刪除、審計日誌、首次設定精靈。
- 登入／註冊／權限隔離、郵件（Resend）與郵件佇列、基本安全標頭。
- Docker／GHCR 多架構鏡像、CI 型別檢查／單元測試／建置／煙霧測試。
- `content/hk-original-expansion.json`：288 道原創題目，4 科 × P1–P6 每格一個單元（PR #1）。
