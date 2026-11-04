# 貢獻指南

謝謝你願意幫忙！三種最有價值的貢獻：

## 1. 題目（最需要）

- 內容包是 `content/*.json`，格式見 [docs/content-packs.md](docs/content-packs.md)。
- **必須原創**，或來自**授權清楚且允許再發佈**的來源（CC0、CC BY、CC BY-SA、MIT、Apache-2.0…，並在內容包註明 `license` 與 `source`）。不得抄錄課本、坊間練習、TSA 或其他受版權保護的題目；從沒有授權聲明的 GitHub 倉庫複製的題目一律不收。
- 英文、中文詞表類單元（`apps/web/src/lib/content/english-data.ts`、`chinese-data.ts`）最需要擴充；加詞條時請確認每個詞表內釋義不重複，現有測試會檢查。
- 對照教育局公開的課程指引和字詞表，確保年級和範圍合適；用香港慣用的繁體字詞。
- 選擇題的干擾項必須「明確錯誤」，不可有第二個合理答案。
- 提交前執行 `cd apps/web && npm test`，內容包驗證會檢查格式。

數學題由程式生成（`apps/web/src/lib/content/math.ts`）。新增生成器時請確保答案可以獨立驗算，並在 `src/lib/__tests__/content.test.ts` 補測試。

## 2. 回報問題

用 issue 範本。**不要貼學生資料、密碼或 API Key。**

## 3. 程式碼

```bash
cd apps/web
npm ci
npm run check     # 型別檢查 + 單元測試 + 建置 + 端到端煙霧測試，PR 前必須全過
```

- 涉及權限、學生資料、登入的改動，請同時在 `scripts/smoke.mjs` 加上對應檢查（包括「不應該被允許」的情況）。
- 用戶可見的文字用繁體中文（香港用語）。
- 保持零外連：不要加入第三方追蹤、CDN 字體或遙測。

提交即表示你同意程式碼以 AGPL-3.0-only、內容以 CC BY-SA 4.0 授權。
