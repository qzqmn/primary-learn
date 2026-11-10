# 學童通 · HK Primary Learn

> 給香港小學 **P1–P6** 的開源教學與練習平台。一個 Docker 鏡像，任何 VPS 都能部署；老師可以派功課、看每位學生的練習情況。

[English](README.en.md) · [部署指南](docs/deployment.md) · [內容包格式](docs/content-packs.md) · [私隱說明](docs/privacy.md) · [架構](docs/architecture.md)

**特色**

- **一台伺服器、一個容器、一個 SQLite 檔**：`docker compose up -d` 即用，沒有外部資料庫要維護。支援 `amd64` 和 `arm64`（Oracle ARM 等）。
- **學生**：數學、英文、中文、常識（P1–P6）；每個單元先有**教學重點、常見錯誤和即時生成的例題**，再做練習；即時對錯和解釋、星星、連續練習日數、**錯題本**（答對自動移出）。
- **老師**：班級、學生（逐個或 CSV 批量）、**可列印的登入卡（含 QR）**、派發功課並看完成率、學生報告（知識點弱項分析、練習記錄）、CSV 匯出、廣播通知。
- **家長**：用電郵註冊，輸入老師給的綁定碼後查看孩子的學習報告。
- **管理員**：網頁精靈首次設定（**沒有寫死的帳號**）、老師審批、全校統計、郵件服務（Resend）設定、審計日誌、**備份匯出與匯入還原**、**上傳內容包擴充題庫**。
- **私隱優先**：學生只有暱稱，不收真名和電郵；沒有第三方追蹤、廣告或外部字體；電郵功能默認關閉。
- **內容與程式分離**：題庫是 JSON「內容包」，放進資料夾即載入，方便社群貢獻。

## 題庫現況（老實說）

目前內建 **105 個練習單元**：

| 科目 | 單元數 | 做法 |
|---|---|---|
| 數學 | 51（P1 7、P2 8、P3 8、P4 9、P5 9、P6 10） | 程式按參數即時生成，答案由程式計算 |
| 英文 | 29 | 精選詞表與語法表生成（詞彙、拼寫、動詞時態、比較級、時間說法…）＋ 75 道人工編寫的固定題 |
| 中文 | 19 | 詞表生成（量詞、反義／近義詞、的地得、成語、唐詩、標點…）＋ 29 道固定題 |
| 常識 | 6 | 48 道人工編寫的固定題 |

**數量上要看清楚**：從 8,000 次抽樣統計，生成題至少有約 **11 萬道不同的題目**，其中 **9.4 萬道是數學**，數學可以放心大量練習。英文和中文是靠詞表生成的，有些單元變化很少（例如「再／在」只有十多道、標點十多道），做幾次就會重複；常識只有 48 道。**這些部分最需要社群擴充**——見 [內容包格式](docs/content-packs.md)。P6 的英文、中文單元也還很少。

### 為甚麼不從 GitHub 上批量搜刮題目

我實際搜尋過：沒有找到授權清楚、又符合香港課程的小學題庫。能找到的開源數據集（例如 GSM8K，MIT 授權）是英文、中一程度的多步題、美國情境，而且作者自己說約有 1.7% 題目有分歧或錯誤——在自動批改的兒童平台上，這等於「答對也被判錯」。而很多倉庫裏的題目其實是複製自課本、坊間練習或 TSA 試題，沒有授權，放進一個以 AGPL／CC BY-SA 公開的項目有版權風險。

所以項目採取兩個做法：

1. **程式生成**（數學、詞表類）：無限量、答案正確、原創。
2. **合法匯入通道**：如果你找到授權清楚的題庫，可以用 `apps/web/scripts/import-pack.mjs` 把 CSV 轉成內容包，人工審核後在後台「題庫與內容包」上傳。內容包**必須註明授權**，只接受 CC0、CC BY、CC BY-SA、MIT、Apache-2.0、BSD、ISC、Unlicense 或原創；**不接受 NC／ND 或無授權的內容**。上傳的內容包存在資料庫，會跟著備份一起匯出和還原，並在單元頁面標明來源和授權。

> 這個授權白名單只是防呆，不能代替你自己確認來源真的使用該授權。

## 快速開始

有兩種部署方式：**（一）在 VPS 上從原始碼建置**（最簡單，下面這節）；**（二）VPS 只拉 GitHub Actions 發佈的鏡像**（見後面）。需要 Docker 和 Docker Compose。

```bash
git clone https://github.com/qzqmn/primary-learn.git
cd primary-learn
cp .env.example .env
docker compose up -d --build
docker compose logs app          # 找到「設定碼 (Setup code)」
```

用瀏覽器打開 `http://伺服器IP:3000`，輸入設定碼，建立管理員帳號，**把顯示的 8 個恢復碼抄下來**（只顯示一次）。完成後 `/setup` 永久關閉。

之後的流程：管理員（或老師）建立班級 → 加入學生 → 列印登入卡 → 同學掃 QR 或輸入班級代碼、暱稱、密碼登入。

> 正式上線前請閱讀 [部署指南](docs/deployment.md)：HTTPS、`APP_URL`、`TRUST_PROXY`、備份和電郵設定。**用公網 IP 加 HTTP 登入，密碼會以明文傳輸**，請務必加上 HTTPS。

### 部署方式二：VPS 只拉鏡像（不需要原始碼）

**推到 GitHub 的 `main` 分支後**，GitHub Actions 會先跑測試和 Docker 煙霧測試，**通過後自動建置 `amd64` + `arm64` 鏡像並發佈到 GHCR**（`ghcr.io/qzqmn/primary-learn:latest`，另有 `:sha-xxxxxxx`；推 `v1.2.3` 標籤時再多 `:1.2.3`、`:1.2`）。Pull request 只跑測試，不發佈。

第一次發佈後：

1. 到 GitHub → 你的個人頁／組織 → **Packages** → 該鏡像 → Package settings：
   - 想讓 VPS 免登入拉取，把可見度改成 **Public**；
   - 或保持 Private，在 VPS 上登入一次：`echo <read:packages 權限的 token> | docker login ghcr.io -u <用戶名> --password-stdin`。
2. 在 VPS 上（不用 clone 倉庫，只需要兩個檔案）：

```bash
mkdir primary-learn && cd primary-learn
# 把倉庫的 deploy/docker-compose.yml 存成 docker-compose.yml，.env.example 存成 .env（用 scp 或 curl 都可以）
# 編輯 .env：APP_IMAGE=ghcr.io/qzqmn/primary-learn:latest（全小寫），並設定 APP_URL、TRUST_PROXY
docker compose up -d
docker compose logs app          # 找設定碼
```

3. 以後每次 push 到 main，鏡像自動更新；VPS 上執行 `docker compose pull && docker compose up -d` 即升級（資料在 volume 內，不受影響）。

> 想自動升級可以另外跑 Watchtower，但建議先備份再升級，所以預設不開。

### 備份、匯出與還原

管理後台 →「備份與還原」：

- **匯出**：隨時下載一個完整的資料庫備份（學生、班級、練習記錄、設定、通知、上傳的內容包…），下載時資料保持一致，不需停機。系統也每日自動備份一份（保留最近 7 份）。
- **匯入還原**：上傳備份檔 → 系統先**驗證**（檔案完整性、只允許本系統的資料表、拒絕觸發器、必須有管理員、不可來自較新版本）並顯示內容摘要 → 再輸入管理員密碼和「還原」二字確認。還原前自動留一份「還原前的安全備份」，過程出錯會自動回復；反悔時可以從列表選那份安全備份再還原一次。
- 搬遷到另一台伺服器：在舊機匯出、新機匯入即可。備份**不含**加密用的 `secret.key`，所以郵件 API Key 要在新機重新輸入。

細節見 [部署指南](docs/deployment.md#4-備份與還原)。

### 升級與維護

```bash
git pull && docker compose up -d --build     # 或 docker compose pull && docker compose up -d
docker compose exec app cli reset-admin      # 忘記管理員密碼又沒有恢復碼和電郵時
docker compose exec app cli list-admins
```

資料庫遷移在啟動時自動執行。升級前建議先在後台「系統設定」下載一份備份。

## 設定

全部可選，詳見 [`.env.example`](.env.example)。

| 變數 | 說明 |
|---|---|
| `APP_URL` | 對外網址（含 `https://`）。用於來源檢查、郵件連結、QR 登入卡 |
| `TRUST_PROXY` | `none`（默認）／`cloudflare`／`xff`。在代理後面必須設定，否則限流抓不到真實 IP |
| `SETUP_TOKEN` / `SETUP_REQUIRE_TOKEN` | 首次設定碼；默認自動產生並印在日誌 |
| `COOKIE_SECURE` | 留空＝HTTPS 時自動啟用 |
| `RESEND_API_KEY` | 郵件金鑰的後備來源；建議改在後台設定（加密儲存） |
| `DATA_DIR` / `CONTENT_DIR` | 資料與內容包目錄（Docker 內為 `/data`、`/content`） |

## 帳號與註冊

| 角色 | 怎麼產生 | 登入 |
|---|---|---|
| 管理員 | 首次設定精靈 | 用戶名或電郵＋密碼 |
| 老師 | 管理員建立，或自行註冊（電郵驗證碼；可設為需審批／自動通過／關閉；指定電郵域名可自動通過） | 用戶名或電郵＋密碼 |
| 家長 | 電郵驗證碼註冊，再輸入老師給的綁定碼 | 用戶名或電郵＋密碼 |
| 學生 | 老師建立（默認，最安全），或用班級代碼自助加入（可選，可設需批准） | 班級代碼＋暱稱＋密碼，或掃登入卡 QR |

自行註冊和「忘記密碼」需要先在後台啟用郵件服務（Resend，需要自己的域名和 API Key）。沒啟用時，老師帳號由管理員建立，管理員忘記密碼則用恢復碼或 `cli reset-admin`。

## 開發

需要 Node.js 22+（不需要編譯工具）。

```bash
cd apps/web
npm ci
npm run dev                 # http://localhost:3000，設定碼會印在終端機
npm run check               # 型別檢查 + 單元測試 + 建置 + 端到端煙霧測試
```

- `npm test`：單元測試（批改、題目生成器、內容包驗證等）。
- `npm run smoke`：對建置好的伺服器跑真實 HTTP 的端到端測試（設定精靈、權限隔離、練習批改、CSV 注入、限流、家長綁定、廣播、備份、刪除資料…），CI 也會對 Docker 鏡像跑一次。

技術棧：Next.js（App Router）+ TypeScript、SQLite（better-sqlite3）+ Drizzle ORM、Tailwind CSS、Argon2id、Zod、Vitest。

## 雙語介面覆蓋範圍

目前是**部分雙語（partial i18n）**，不是全站雙語，請勿誤解：

- **運作方式**：切換器把偏好寫入 `localStorage` + cookie（`hkpl-locale`）；客戶端元件經 `t()`／`useLocale()` 即時切換，伺服器端頁面（RSC）由 `lib/serverI18n.ts` 讀 cookie 後渲染，切換時 `LocaleSwitch` 會觸發 `router.refresh()` 重取伺服器內容。
- **已覆蓋**：根切換器與語言標籤；三個 layout 的導覽（學生「錯題本」、後台全部選單、家長「更改密碼」）、登出按鈕；學生首頁的問候、連續日數、今日複習卡、功課卡、科目／年級標籤與單元卡文字；`<html lang>` 同步。
- **尚未覆蓋**：各頁面內文、表單標籤、錯誤訊息、報告、題庫與練習題目仍是繁中；後台各頁的內文、試卷管理、內容包等頁面本體未接入 `t()`。
- **後續工作**：把其餘頁面的可見字串改為 `t()` key；補齊字典其餘字串；評估題目／內容包的雙語結構。
- **使用方式**：客戶端元件需同時呼叫 `useLocale()` 才會在切換時重新渲染；伺服器端元件用 `await getServerT()`；刻意不使用 context，降低導入成本。

## 本輪更新（v0.2.3 之後，尚未發版）

完整逐項清單見 [CHANGELOG.md](CHANGELOG.md)。這輪把先前清單上**所有**項目一次做完，分四塊：

### A. 管理後台

- **A1 上傳前預覽＋兩步確認**：`POST /api/admin/content/validate` 先解析並回傳 4 科 × P1–P6 落格、題數、授權、單元 ID 衝突；按「確認上傳」才真正寫入，不再選檔即生效。
- **A2 內容包詳情頁**：`/admin/content/[name]` 可展開 `unit → 題目`（題面、選項、答案、解釋、tag），僅管理員可見；目錄包與資料庫上傳包都可看。
- **A3 逐題編輯**：`PATCH /api/admin/content/[name]/question` 修改單題並寫入 `auditLogs`；**只適用資料庫上傳包**，`content/` 目錄包仍須改檔重部署。
- **A4 衝突醒目提示**：後台矩陣上方直接列出重複的 unit id，並提供「停用上傳包」按鈕，不必再到頁面底部找 `cat.errors`。
- **A5 授權與來源治理**：`contentPacks` 新增授權條文連結、原始來源、取用日期、改編說明、覆核欄位；學生端單元頁顯示「授權條款／原始來源／取用日期／改編說明」，並顯示逐題 `source`。
- **A6 人工抽檢覆核**：詳情頁可抽 5 題試做並標記「已人工覆核」，後台列表顯示「未覆核」狀態。自動測試能證明分配到哪一格，**測不到難度與超綱**，這一步仍須人工。

### B. 學生／老師／家長

- **B1 間隔重複（SRS）**：`lib/srs.ts`（SM-2 排程）、`srsCards` 表、`/api/learn/review`、`/learn/review` 每日複習；答對拉長間隔、答錯重置並記 lapses。錯題本不再只是「再做一次」。
- **B2 學習熱圖**：`/learn/heatmap` 顯示 4 科 × P1–P6 的正確率與弱點格。
- **B3 固定卷面功課**：`assignments` 新增 `mode`／`paperId`／`timeLimitMin`／`pointsPerQuestion`，固定題序、時限倒數、按分計分，並把 `assignmentId` 串回 `attempts`。
- **B4 PWA／徽章／雙語**：manifest＋版本化 Service Worker（`/api/` 與含答案回應不快取）；5 種徽章由 `POST /api/learn/finish` 頒發，學生首頁有入口；繁中／英切換器與共用字典。**雙語僅覆蓋共用字串**，見上節。
- **B5 家長只讀週報**：`/api/parent/report` 提供本週練習摘要，家長頁只讀、不能改答案。

### C. 試卷、題庫與部署文件

- **C1 試卷（三種方案一次做齊）**：`papers` 表＋4 支 API＋後台審核頁＋學生作答頁。`lib/papers.ts` 的合規閘只接受①教師原創卷（須原創聲明）②明確開放授權卷（須 `license`／`licenseUrl`／`retrievedAt`）③只存外連、不存題目的索引卷；**NC／ND／無授權、課本／TSA／補習社／商業試卷一律拒絕**。所有卷須 `approved` 才能作答，學生只看到已審核且公開／所屬班級的卷。
- **C2 參數化數學**：新增 6 個 `mx-pN-*` 單元（P1–P6 各一），以 `gens` 即時產生無限題、自帶 `lesson`，難度對齊既有內建分級；先前 288 道靜態題保留，兩者不衝突。
- **C3 部署文件**：[docs/deployment.md](docs/deployment.md) 補上 Dockge／Portainer 的 `name:` 與 stack 目錄名誤判、「未啟動」但不影響服務、安全改名法、不可改 project name 的原因，以及升級要用 `docker compose pull && up -d`。

### D. 非功能

- **TOTP 二步驗證**：`/account/totp` 綁定／啟用／停用，登入第二段驗證，含限流與審計（`totpSecrets`）。
- **資料保留**：後台設定保留天數，先預覽筆數再手動執行，清理 `attempts`／`attemptAnswers`／`emailLogs`／`auditLogs`；帳號、錯題、題庫永不因保留期刪除。
- **郵件模板編輯**：後台可改驗證信與廣播信的主旨／內文，`lib/mail/templates.ts` 讀取覆寫。
- **老師邀請連結**：`/api/admin/invites` 產生限次、限時連結，`/invite/[code]` 兌換並寫審計。
- **發版與安全**：`release.yml` 改為僅手動觸發，終結 `v*.*.*` tag 重複發版；CSP 移除 `'unsafe-eval'`、補上 `object-src`／`base-uri`／`frame-ancestors`；GHCR 鏡像名與 clone 路徑統一為 `qzqmn/primary-learn`；補上 `CHANGELOG.md`。

### 尚未完成（誠實保留）

- **全站雙語**：只有共用字典與切換器會切換；各頁內文、表單、錯誤訊息、報告、題目仍是繁中，伺服端頁面固定繁中渲染。見「雙語介面覆蓋範圍」。
- **嚴格 CSP**：`script-src` 仍保留 `'unsafe-inline'`，須待 Next.js inline script nonce 化才能移除。
- 粵拼／拼音切換、瀏覽器推送、AI 輔助出題、閱讀理解長文題；英文／中文／常識題量仍相對少（見「題庫現況」）。
- **資料保留目前是手動**：後台按鈕才會執行，沒有 cron／排程自動清理。
- **逐題編輯只對 DB 上傳包有效**：隨系統附帶的目錄包（`content/`）仍須改檔並重新部署。
- **試卷合規閘是程式規則，不是法律保證**：授權真偽與「是否真的開放授權」仍須人工查證；公開卷請先走審核。
- 目錄包／上傳包**不要同時放同一份 JSON**（unit id 會撞車）；`README.en.md` 只同步了倉庫與鏡像名稱，功能說明尚未跟上本輪改動。
- 本輪功能通過型別檢查、219 個單元測試、正式建置與 HTTP 煙霧測試，但**TOTP、郵件、PWA 安裝、試卷審核流程、Docker 升級仍須在正式環境實測**；本專案未經獨立安全審計。

郵件功能（驗證碼、廣播）依賴你自己的 Resend 帳號與已驗證的域名；程式碼已寫好並測試了「未啟用」和排隊邏輯，但**上線前請你用真實帳號實測一次**（後台有「發送測試郵件」按鈕）。

本專案尚未經過獨立的安全審計。涉及兒童資料，部署者須自行確保符合《個人資料（私隱）條例》——見 [私隱說明](docs/privacy.md)。發現漏洞請看 [SECURITY.md](SECURITY.md)。

## 貢獻

歡迎題目、翻譯、錯誤回報和程式碼。請先讀 [CONTRIBUTING.md](CONTRIBUTING.md)。**所有題目必須是原創**，不得抄錄課本、坊間練習或 TSA 試題。

## 授權

- 程式碼：[AGPL-3.0-only](LICENSE)。若你修改後以網絡服務形式提供給他人使用，須公開你的修改。
- `content/` 內的官方示例內容包：CC BY-SA 4.0。
