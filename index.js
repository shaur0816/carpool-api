import express from "express";
import { google } from "googleapis";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 讀取 Service Account JSON
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

// Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Sheets API
const sheets = google.sheets({ version: "v4", auth });

// Google Sheet ID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 工作表名稱（你可以改）
const SHEET_NAME = "carpool-data";


// 1️⃣ 取得名單（所有欄位）
app.get("/list", async (req, res) => {
  try {
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:Z100`,
    });

    const values = read.data.values || [];

    // 轉置：把每一欄視為一個時段
    const columns = [];
    const maxCol = values[0]?.length || 5;

    for (let c = 0; c < maxCol; c++) {
      const colData = [];
      for (let r = 0; r < values.length; r++) {
        if (values[r][c]) colData.push(values[r][c]);
      }
      columns.push(colData);
    }

    res.json(columns);
  } catch (err) {
    console.error("讀取錯誤:", err);
    res.status(500).json({ error: "讀取試算表失敗" });
  }
});


// 2️⃣ 新增姓名到指定欄位
app.post("/add", async (req, res) => {
  const { columnIndex, name } = req.body;

  if (!name) return res.status(400).json({ error: "姓名不能為空" });

  const colLetter = String.fromCharCode(65 + columnIndex); // A=0 B=1…

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${colLetter}1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[name]],
      },
    });

    res.json({ status: "success" });
  } catch (err) {
    console.error("新增錯誤:", err);
    res.status(500).json({ error: "寫入失敗" });
  }
});


// 3️⃣ 刪除指定欄、指定列
app.post("/delete", async (req, res) => {
  const { columnIndex, rowIndex } = req.body;

  const colLetter = String.fromCharCode(65 + columnIndex);
  const row = rowIndex + 1;

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${colLetter}${row}`,
      valueInputOption: "RAW",
      requestBody: { values: [[""]] },
    });

    res.json({ status: "success" });
  } catch (err) {
    console.error("刪除錯誤:", err);
    res.status(500).json({ error: "刪除失敗" });
  }
});


// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("後端運作中，port =", port);
});


