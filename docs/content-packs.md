# 內容包格式

內容包是一個 JSON 檔。有兩種加入方式：

1. **後台上傳（建議）**：管理後台 →「題庫與內容包」→ 上傳 JSON。立即生效，存在資料庫，**會跟著備份匯出與還原**；可隨時停用、下載、刪除。
2. **放進資料夾**：把 JSON 放進 `CONTENT_DIR`（Docker 內 `/content`，compose 裏有掛載範例），重啟後載入。適合隨程式碼一起發佈的官方內容。

兩種方式都會驗證格式；**格式有誤的包會被拒絕（上傳）或跳過並記錄原因（資料夾），不影響其他內容**。

```json
{
  "pack": "my-school-english",
  "version": 1,
  "license": "CC BY-SA 4.0",
  "source": "本專案原創（或來源網址）",
  "units": [
    {
      "id": "e3-prepositions",
      "subject": "english",
      "grade": 3,
      "title": "Prepositions 介詞",
      "intro": ["in（在…裏面）、on（在…上面）、under（在…下面）。"],
      "questions": [
        {
          "type": "choice",
          "prompt": "The ball is ___ the box. (球在盒子裏面)",
          "choices": ["in", "on", "under", "behind"],
          "answer": "in",
          "explain": "in 表示在裏面。",
          "tag": "e-grammar-prep"
        }
      ]
    }
  ]
}
```

## 欄位

| 欄位 | 說明 |
|---|---|
| `pack`、`version` | 包名稱（小寫英文、數字、`-`）和版本 |
| `license` | **必填**。上傳時只接受：CC0、CC BY、CC BY-SA、MIT、Apache-2.0、BSD、ISC、Unlicense、原創。**不接受 NC（非商業）、ND（禁止改作）或沒有授權的內容** |
| `source` | 選填，來源網址或說明；顯示在後台 |
| `units[].id` | 全站唯一，只可用小寫英文、數字、`-`。與內建單元（`m1-…`）或其他包重複會被拒絕 |
| `units[].subject` | `math`／`english`／`chinese`／`general`（常識） |
| `units[].grade` | 1–6 |
| `units[].intro` | 練習前的溫習講解（每個字串一段） |
| `units[].lesson` | 選填：`{ "points": ["教學重點…"], "pitfalls": ["常見錯誤…"] }`；有的話取代 intro 顯示 |
| `questions[].tag` | 知識點代碼（自訂，用於報告裡的弱項分析；同一知識點請用同一個代碼） |
| `questions[].type` | `choice`（單選）、`text`（文字作答）、`number`（數字作答） |

### 題型

- **choice**：`choices`（2–6 個，**必須包含 `answer`**，順序每次作答會隨機打亂）、`answer`。
- **text**：`answer`，可選 `accept: ["其他可接受的寫法"]`。比對時會去掉空格和標點、全形轉半形、忽略英文大小寫。
- **number**：`answer`（數字字串），可選 `suffix`（顯示在輸入框後，如「厘米」）。接受全形數字、千分位逗號、`%`、`$`。

## 寫題目的原則

1. **原創**。不得抄錄課本、坊間練習、TSA 或任何受版權保護的題目。
2. **只有一個正確答案**。選擇題的干擾項要「明確錯誤」。（反義詞題尤其要小心：例如「冷」的反義詞，「熱」和「暖」都說得通就不要同時出現。）
3. 對照教育局公開的課程指引和字詞表；用香港慣用的繁體字詞。
4. 每題附 `explain`，答錯時學生會看到。
5. 每個單元至少 8–10 題，否則 10 題練習會重複太多（靜態題庫每次練習不會重複同一題，題數超過題庫時只出現題庫全部）。

## 從 CSV 轉換（授權清楚的題庫）

如果你找到一份**授權清楚**的題庫（CSV），可以先轉成內容包再人工審核：

```bash
cd apps/web
node scripts/import-pack.mjs questions.csv \
  --pack my-english-g3 --unit-id e3-my-unit --subject english --grade 3 \
  --title "我的單元" --license CC0-1.0 --source "https://example.org/dataset" --tag e-my-tag > pack.json
```

CSV 第一列是標題列：`prompt, answer, wrong1, wrong2, wrong3, explain, tag`。有 `wrong1…` 的是單選題，沒有的是文字題；支援雙引號包住含逗號的欄位。工具會拒絕重複選項，並要求 `--license`。**轉換後請逐題核對答案、年級和用字（繁體、香港用語），再到後台上傳——上傳後學生馬上會看到。**

> 不要把來源不明、沒有授權或抄自課本／TSA／坊間練習的題目放進來。沒有授權聲明的 GitHub 倉庫，法律上等於「保留所有權利」，不可以使用。

## 數學為何不用內容包

數學題由程式按參數即時生成（`apps/web/src/lib/content/math.ts`），題量無限，且答案由程式計算，不會有抄錄錯誤。新增生成器時請在 `src/lib/__tests__/content.test.ts` 補測試（測試會對每個單元用大量隨機種子檢查答案自洽，並對加減乘除用獨立算法驗算）。

## 授權

官方示例內容包以 CC BY-SA 4.0 授權。你自己的內容包授權由你決定；要合併回本專案請使用 CC BY-SA 4.0。
