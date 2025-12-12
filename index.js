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
const RANGE = "工作表1!A1:Z100";

/** -------------------------
 * 3. 讀取 Google Sheet（前端用）
 * 🔥 重點：永遠跳過 Sheets 第 1 列（標題列）
 * 🔥 第 0 列 = Google Sheet 第 2 列（完全對齊）
 --------------------------*/
app.get("/list", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const values = response.data.values || [];

    // 🔥 跳過第一列（標題列），只取人名
    const rows = values.slice(1);

    // 建立 5 個欄位
    const columns = [[], [], [], [], []];

    rows.forEach((row) => {
      row.forEach((name, col) => {
        if (name && col < 5) {
          columns[col].push(name.trim());
        }
      });
    });

    res.json(columns);
  } catch (error) {
    console.error("❌ 讀取試算表失敗：", error);
    res.status(500).json({ error: "讀取試算表失敗" });
  }
});

/** -------------------------
 * 4. 新增姓名（寫入 Google Sheet）
 * 🔥 新增到 Google Sheet 的「最後一列」
 --------------------------*/
app.post("/add", async (req, res) => {
  const { columnIndex, name } = req.body;

  if (columnIndex < 0 || columnIndex > 4)
    return res.status(400).json({ error: "columnIndex 無效" });

  const column = ["A", "B", "C", "D", "E"][columnIndex];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `工作表1!${column}2`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
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
 * 5. 刪除姓名
 * 🔥 rowIndex = 前端的 idx（已修正，不再 -1）
 * 🔥 Google Sheet 對應列 = rowIndex + 2
 --------------------------*/
app.post("/delete", async (req, res) => {
  const { columnIndex, rowIndex } = req.body;

  const column = ["A", "B", "C", "D", "E"][columnIndex];
  const targetRow = rowIndex + 2; // ← Google Sheet 列號（第 2 列開始是人名）

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `工作表1!${column}${targetRow}`,
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
 * 6. 啟動伺服器（支援 Zeabur）
 --------------------------*/
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("🚀 Server running on port", port);
});
