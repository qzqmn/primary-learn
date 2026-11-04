# 架構

```
瀏覽器 (學生 / 老師 / 家長 / 管理員)
        │ HTTPS（Caddy / Cloudflare Tunnel / Nginx）
  ┌─────▼──────────────────────────────┐
  │ 單一容器：Next.js (standalone)      │
  │  • 頁面 (React Server Components)   │
  │  • /api/*  路由處理器               │
  │  • 背景工作：郵件隊列、每日備份、清理 │
  └─────┬───────────────┬──────────────┘
   /data（volume）    /content（內容包）
   app.db  backups/  .secret
```

## 目錄

```
apps/web/
  src/app/            頁面與 API 路由（學生 /learn、後台 /admin、家長 /parent、登入／註冊／設定）
  src/lib/
    content/          題庫：types、math（生成器）、registry（內容包載入與驗證）、engine（出題）、grade（批改）
    practice.ts       練習流程：開始、逐題批改、完成、錯題重做（答案只在伺服端）
    stats.ts          統計與報告查詢
    access.ts         資源擁有權檢查（老師↔班級、家長↔孩子）
    broadcast.ts      廣播：收件人解析、站內通知、郵件隊列
    mail/             Resend 整合與郵件模板
    db/               Drizzle schema；啟動時自動遷移
  drizzle/            SQL 遷移檔
  scripts/            cli.mjs（維護工具）、smoke.mjs（端到端測試）
content/              官方示例內容包（JSON）
docker/               Dockerfile、Caddyfile
```

## 設計決定

- **答案不離開伺服器**：`/api/learn/start` 只回傳題目；每題提交後才回傳對錯、正確答案和解釋。完整題目（含答案）以 JSON 存在 `attempts.questions`。
- **權限在伺服端**：每個 API 和頁面各自檢查角色與擁有權，不依賴前端隱藏按鈕。Next.js 的 layout 與 page 會同時渲染，所以 page 不能假設 layout 已擋住未授權的請求。
- **SQLite（WAL）**：一個檔案，備份用線上備份 API。適合數百學生的單機構；若要多機或更大規模，需要換資料庫。
- **一次一份練習**：題目由隨機種子生成並整份存起來，不需要重算，也可以事後在報告中對照。
- **郵件隊列用資料庫**：不引入 Redis，維持單容器。每次最多 5 封、間隔 0.6 秒，失敗指數退避，5 次放棄。
