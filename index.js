import express from "express";
import cors from "cors";
import { google } from "googleapis";

const app = express();
app.use(cors());
app.use(express.json());

/** -------------------------
 * 1. 載入 Google Service Account
 --------------------------*/
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
} catch (err) {
  console.error("❌ GOOGLE_SERVICE_ACCOUNT_KEY 解析失敗！");
}

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

/** -------------------------
 * 2. 試算表設定
 --------------------------*/
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = "工作表1!A1:Z100";  // ← 你要求放這裡

/** -------------------------
 * 3. 讀取 Google Sheet（前端用）
 --------------------------*/
app.get("/list", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const values = response.data.values || [];

    // 將資料轉換成每欄陣列，例如：
    // [
    //   ["小明","小華"],
    //   ["小美"],
    //   []
    // ]
    const columns = [[], [], [], [], []];
    for (let row of values.slice(1)) {
      row.forEach((name, index) => {
        if (name && index < 5) columns[index].push(name);
      });
    }

    res.json(columns);
  } catch (error) {
    console.error("❌ 讀取 Google Sheets 失敗：", error);
    res.status(500).json({ error: "讀取試算表失敗" });
  }
});

/** -------------------------
 * 4. 新增姓名（寫入 Google Sheet）
 --------------------------*/
app.post("/add", async (req, res) => {
  const { columnIndex, name } = req.body;

  if (columnIndex < 0 || columnIndex > 4)
    return res.status(400).json({ error: "columnIndex 無效" });

  const column = ["A", "B", "C", "D", "E"][columnIndex];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `工作表1!${column}1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[name]],
      },
    });

    res.json({ status: "success" });
  } catch (error) {
    console.error("❌ 新增失敗：", error);
    res.status(500).json({ error: "寫入資料失敗" });
  }
});

/** -------------------------
 * 5. 刪除姓名（清空特定儲存格）
 --------------------------*/
app.post("/delete", async (req, res) => {
  const { columnIndex, rowIndex } = req.body;

  const column = ["A", "B", "C", "D", "E"][columnIndex];

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `工作表1!${column}${rowIndex + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [[""]] },
    });

    res.json({ status: "success" });
  } catch (error) {
    console.error("❌ 刪除失敗：", error);
    res.status(500).json({ error: "刪除資料失敗" });
  }
});

/** -------------------------
 * 6. 啟動伺服器
 --------------------------*/
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("🚀 Server running on port", port);
});
