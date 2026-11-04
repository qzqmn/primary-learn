# 部署指南

## 資源需求

實測（Node 22、單容器、剛啟動並載入過一頁）閒置記憶體約 **115 MB**；40 位學生同時登入的瞬間峰值約 120 MB（Argon2 跑在執行緒池，並行數受限，不會因為整班同時登入而暴漲）。1 vCPU / 512 MB 的小機可以運行，建議 1 GB 以上。鏡像解壓後約 85 MB（不含 Node 基礎層）。

## 1. 基本部署

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs app        # 看「設定碼」
```

資料全部在名為 `data` 的 Docker volume（容器內 `/data`）：`app.db`（資料庫）、`backups/`（每日自動備份，保留 7 份）、`.secret`（加密用密鑰，自動產生）。

> 若你改用 bind mount（例如 `./data:/data`），目錄必須屬於容器用戶（uid 1000）：`sudo chown -R 1000:1000 ./data`。

## 2. HTTPS（正式使用必做）

沒有 HTTPS，密碼會以明文在網絡上傳輸。選一種：

### A. Caddy（自動申請證書）

1. 把網域的 DNS A/AAAA 記錄指到這台伺服器，開放 80 和 443 埠。
2. `.env` 設定：
   ```
   DOMAIN=learn.example.com
   APP_URL=https://learn.example.com
   TRUST_PROXY=xff
   BIND=127.0.0.1
   ```
3. `docker compose --profile caddy up -d`

### B. Cloudflare Tunnel（不用開埠，適合家用或 NAS）

1. 在 Cloudflare Zero Trust 建立 Tunnel，Public Hostname 指向 `http://app:3000`，複製 token。
2. `.env` 設定 `TUNNEL_TOKEN=…`、`APP_URL=https://你的網域`、`TRUST_PROXY=cloudflare`、`BIND=127.0.0.1`。
3. `docker compose --profile tunnel up -d`

### C. 已有 Nginx／Traefik

反向代理到 `127.0.0.1:3000`，設 `APP_URL`、`TRUST_PROXY=xff`，並確保代理**覆寫**（而不是轉發）客戶端傳來的 `X-Forwarded-For`。

### 為什麼要設 `TRUST_PROXY`

登入限流按「帳號＋IP」計算。在代理後面如果不設，所有人看起來都來自同一個 IP（或無法取得 IP），限流只能按帳號。相反，如果沒有代理卻設成 `xff`，攻擊者可以偽造標頭繞過限流——所以只在確實有代理時才設。

## 3. 電郵（可選，但自行註冊和找回密碼需要）

1. 到 [Resend](https://resend.com) 註冊，**驗證你的發信域名**（加 SPF／DKIM 記錄）。沒驗證域名通常只能發給你自己的帳號，不能用於正式註冊。
2. 建立 API Key。
3. 管理後台 → 郵件服務：填入 API Key、發件地址，按「發送測試郵件」，成功後啟用。
4. 費用和額度以 Resend 官網為準；後台可設定每日發送上限，避免被濫用而耗盡額度。

沒有啟用電郵時：老師由管理員建立；管理員忘記密碼用恢復碼或 `docker compose exec app cli reset-admin`；學生由老師重設密碼。

驗證碼和廣播郵件的內容會經過 Resend（第三方），詳見 [私隱說明](privacy.md)。

## 4. 備份與還原

所有操作在管理後台 →「備份與還原」。

- **自動**：每日一份到 `/data/backups/app-YYYY-MM-DD.db`（SQLite 線上備份，不需停機），保留最近 7 份。**這些備份和資料庫在同一個磁碟上**，磁碟壞了就一起沒了——請把備份複製到別處。
- **手動匯出**：「立即下載備份」，或「在伺服器上建立一份」（保留在 `backups/`，最多 10 份）。
- **匯入還原**（兩步）：
  1. 上傳 `.db` 備份檔（或從伺服器列表選「還原此備份」）。系統**只檢查、不改動**，並顯示學生／老師／家長／班級／作答記錄數量。檢查包括：檔頭、`integrity_check`、只允許本系統已有的資料表、拒絕觸發器與檢視表、必須有可用的管理員、不可來自較新版本的系統。
  2. 輸入管理員密碼和「還原」二字確認。系統先建立 `pre-restore-….db` 安全備份，再換檔、重新開啟並自動遷移。任何一步失敗都會自動換回安全備份。
- **反悔**：還原完成後，從列表選那份 `pre-restore-…` 備份再還原一次，就回到還原前的狀態。
- **還原後**：所有人需要重新登入（備份內的登入狀態會被保留，但建議重新登入）。
- **搬遷到新伺服器**：舊機「立即下載備份」→ 新機完成首次設定後，「匯入並還原」。備份**不包含**加密密鑰檔 `secret.key`：
  - 郵件服務的 API Key 因此無法解密，請在新機的「郵件服務」重新輸入；
  - 未使用的家長綁定碼和驗證碼會失效（要請老師重新產生）。
  - 若想保留，可另外複製 volume 內的 `secret.key`（它和備份放在一起會降低保護，請妥善保管）。
- **上傳大小**：預設上限 512 MB（環境變數 `BACKUP_MAX_MB`）。經 Cloudflare Tunnel 等代理時要留意代理本身的上傳限制（部分免費方案約 100 MB）；較大的備份可改為把檔案複製進 volume 的 `backups/`（檔名須符合 `manual-YYYYMMDD-HHMMSS.db`），再從列表選擇還原。
- **命令列**（進階）：`docker compose cp app:/data/backups ./offsite-backups`。

## 5. 升級

```bash
git pull
docker compose up -d --build        # 或：docker compose pull && docker compose up -d
```

資料庫遷移會自動執行（只向前）。升級前先備份。

## 6. 發佈自己的鏡像（GitHub Actions）

單一個工作流程 `.github/workflows/ci.yml`，三個階段依序執行：

| 階段 | 做什麼 | 何時跑 |
|---|---|---|
| `test` | 型別檢查、單元測試、建置、端到端煙霧測試 | 每次 push、每個 pull request |
| `docker` | 建置 Docker 鏡像、啟動容器、對容器跑煙霧測試 | 同上（`test` 通過後） |
| `publish` | 建置 `linux/amd64` + `linux/arm64` 鏡像並推送到 GHCR | **只有 push 到 `main`、推送 `v*.*.*` 標籤或手動觸發**，且前兩階段都通過 |

發佈的標籤：`:latest`、`:sha-xxxxxxx`；推送 `v1.2.3` 標籤時另有 `:1.2.3`、`:1.2`。Pull request（包括來自 fork 的）不會發佈。

**第一次設定**

1. 把倉庫推上 GitHub 的 `main` 分支，到 Actions 頁籤確認三個階段都成功。如果 `publish` 失敗並提示沒有權限，到倉庫 Settings → Actions → General → Workflow permissions，選「Read and write permissions」。
2. 鏡像會出現在你的 GitHub **Packages**。預設是私有的：
   - 讓 VPS 免登入拉取：Package settings → Change visibility → Public；
   - 或保持私有，在每台 VPS 登入一次：`echo <token> | docker login ghcr.io -u <用戶名> --password-stdin`（token 需要 `read:packages` 權限）。
3. 在 VPS 用 `deploy/docker-compose.yml`（只拉鏡像、不建置），`.env` 裡設 `APP_IMAGE=ghcr.io/你的用戶名/hk-primary-learn:latest`（全小寫）。

**之後的日常**：改程式 → push 到 main → 等 Actions 綠燈（鏡像自動更新）→ VPS 上 `docker compose pull && docker compose up -d`。想固定在某個版本，就把 `APP_IMAGE` 設成 `…:1.2.3` 或 `…:sha-xxxxxxx`；出問題時改回上一個標籤即可回退（資料庫遷移只向前，回退前請先備份）。

## 7. 疑難排解

| 現象 | 原因／處理 |
|---|---|
| 找不到設定碼 | `docker compose logs app`；或 `docker compose exec app cli setup-token` |
| 登入後馬上被登出／操作被拒（403 請求來源不明） | `APP_URL` 與實際網址不一致，或代理沒有傳 `Host`／`X-Forwarded-Host` |
| 登入頻繁被限流 | 沒有設 `TRUST_PROXY`，或設錯 |
| 容器無法寫入 `/data` | bind mount 的目錄權限，見上 |
| 郵件發不出 | 後台「郵件服務」看錯誤訊息；多數是域名未驗證或發件地址不屬於已驗證域名 |
