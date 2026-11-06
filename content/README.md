# 內容包 (Content packs)

每個 `*.json` 檔是一個內容包，啟動時由伺服器載入並驗證。放進 `CONTENT_DIR`（Docker 內為 `/content`）即可，無需改程式。
格式見 `docs/content-packs.md`。官方示例內容包以 CC BY-SA 4.0 授權。

## 本目錄的內容包

| 檔案 | 內容 |
| --- | --- |
| `official-chinese.json`、`official-english.json`、`official-general.json` | 官方示例 |
| `hk-original-expansion.json` | 原創擴充包：4 科 × P1–P6 共 24 個單元、288 題；題目以自撰詞表與確定性參數表生成，未取自任何課本、坊間練習、TSA 試卷或第三方題庫。CC BY-SA 4.0 |

**同一份題目請二選一，不要同時放進 `content/` 又從後台上傳。** `loadCatalog()` 以 unit id 去重，兩邊同時存在時後載入的那份會被略過並記為錯誤（測試 `expect(errors).toEqual([])` 會失敗）；反過來，先放資料夾再上傳同一份 JSON，後台會回 409「單元 ID 已被使用」。

資料夾方式不需額外設定：`docker/Dockerfile` 已 `COPY content /content` 並設 `CONTENT_DIR=/content`；測試則在 `content.test.ts` 把 `CONTENT_DIR` 指向本目錄。

若內容包有 `math` 單元，每個單元都要自帶 `lesson.points`（≥2 條）與 `lesson.pitfalls`（≥1 條），否則 CI 的教學內容測試會失敗，詳見 `docs/content-packs.md`。
