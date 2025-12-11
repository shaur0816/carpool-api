import express from "express";
import { google } from "googleapis";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 1️⃣ 從 Zeabur 的環境變數讀取 Service Account JSON
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

// 2️⃣ 使用 Google Auth 進行授權
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// 3️⃣ Google Sheets 初始化
const sheets = google.sheets({ version: "v4", auth });

// 4️⃣ 你的 Google Sheet ID（也可改成環境變數）
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 🟩 測試 API：讀取試算表內容
app.get("/rows", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "工作表1!A1:Z1000",
    });

    res.json({
      status: "success",
      data: response.data.values || [],
    });
  } catch (error) {
    console.error("Google Sheets Error:", error);
    res.status(500).json({ error: "Google Sheets 發生錯誤" });
  }
});

// 🟦 新增資料到 Google Sheets
app.post("/add", async (req, res) => {
  const { name, phone, from, to } = req.body;

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "工作表1!A1",
      valueInputOption: "RAW",
      requestBody: {
        values: [[name, phone, from, to, new Date().toLocaleString()]],
      },
    });

    res.json({ status: "success", message: "資料已新增" });
  } catch (error) {
    console.error("寫入 Google Sheets 錯誤:", error);
    res.status(500).json({ error: "無法寫入資料" });
  }
});

// 🟠 伺服器啟動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

