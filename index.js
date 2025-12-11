import express from "express";
import cors from "cors";
import { google } from "googleapis";

const app = express();
app.use(cors());
app.use(express.json());

// 讀取 Service Account JSON（Zeabur 的環境變數）
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

// Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Google Sheets 客戶端
const sheets = google.sheets({ version: "v4", auth });

// Google Sheet ID（環境變數）
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 工作表名稱
const SHEET_NAME = "工作表1";

// 取得名單列表 -----------------------------------------
app.get("/list", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E1000`,  // 從第 2 列開始讀資料
    });

    const rows = response.data.values || [];

    // 轉成符合前端的格式：5 欄陣列
    const columns = [[], [], [], [], []];

    rows.forEach((row) => {
      for (let i = 0; i < 5; i++) {
        if (row[i]) columns[i].push(row[i]);
      }
    });

    res.json(columns);
  } catch (error) {
    console.error("讀取錯誤：", error);
    res.status(500).json({ error: "讀取試算表失敗" });
  }
});

// 新增姓名 ----------------------------------------------
app.post("/add", async (req, res) => {
  const { columnIndex, name } = req.body;

  if (columnIndex === undefined || !name) {
    return res.status(400).json({ error: "缺少欄位或姓名" });
  }

  try {
    const colLetter = String.fromCharCode(65 + columnIndex); // 0→A, 1→B...

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${colLetter}2`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[name]],
      },
    });

    res.json({ status: "success", message: "新增成功" });
  } catch (error) {
    console.error("新增錯誤：", error);
    res.status(500).json({ error: "新增失敗" });
  }
});

// 刪除姓名 ----------------------------------------------
app.post("/delete", async (req, res) => {
  const { columnIndex, rowIndex } = req.body;

  try {
    const colLetter = String.fromCharCode(65 + columnIndex); // A-E
    const targetRow = rowIndex + 2; // 因為資料從第 2 列開始

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!${colLetter}${targetRow}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[""]], // 清空該格
      },
    });

    res.json({ status: "success", message: "刪除成功" });
  } catch (error) {
    console.error("刪除錯誤：", error);
    res.status(500).json({ error: "刪除失敗" });
  }
});

// 啟動伺服器 ----------------------------------------------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port " + port));

