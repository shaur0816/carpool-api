import express from "express";
import cors from "cors";
import { google } from "googleapis";

const app = express();
app.use(cors());
app.use(express.json());

// 1️⃣ 從環境變數讀取 Service Account JSON（Zeabur 版本）
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// 2️⃣ Google Sheets 客戶端
const sheets = google.sheets({ version: "v4", auth });

// 3️⃣ 你的試算表 ID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 4️⃣ 工作表名稱（固定用你的「工作表1」）
const RANGE = "工作表1!A1:E100"; 
// A~E 五欄 = 五個時段

/* ------------------------------------------
   🟩 GET /list   → 取得全部登記資料
-------------------------------------------*/
app.get("/list", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = result.data.values || [];

    // 轉成前端需要的格式：五個 Array
    const columns = [[], [], [], [], []];

    rows.forEach((row) => {
      row.forEach((name, colIndex) => {
        if (name && columns[colIndex]) {
          columns[colIndex].push(name);
        }
      });
    });

    res.json(columns);
  } catch (err) {
    console.error("GET /list error:", err);
    res.status(500).json({ error: "無法讀取 Google Sheet" });
  }
});

/* ------------------------------------------
   🟦 POST /add    → 新增一筆資料
-------------------------------------------*/
app.post("/add", async (req, res) => {
  const { columnIndex, name } = req.body;

  if (columnIndex === undefined || !name) {
    return res.status(400).json({ error: "缺少 columnIndex 或 name" });
  }

  try {
    // 找該欄資料的下一列
    const colLetter = String.fromCharCode(65 + columnIndex); // A,B,C,D,E
    const range = `工作表1!${colLetter}:${colLetter}`;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [[name]],
      },
    });

    res.json({ status: "success" });
  } catch (err) {
    console.error("POST /add error:", err);
    res.status(500).json({ error: "無法寫入 Google Sheet" });
  }
});

/* ------------------------------------------
   🟧 POST /delete → 刪除一筆資料
-------------------------------------------*/
app.post("/delete", async (req, res) => {
  const { columnIndex, rowIndex } = req.body;

  try {
    const colLetter = String.fromCharCode(65 + columnIndex);
    const deleteRange = `工作表1!${colLetter}${rowIndex + 1}`;

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: deleteRange,
    });

    res.json({ status: "deleted" });
  } catch (err) {
    console.error("POST /delete error:", err);
    res.status(500).json({ error: "刪除資料失敗" });
  }
});

/* ------------------------------------------ */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`後端服務已啟動 at port ${PORT}`);
});
