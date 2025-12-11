const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "你的試算表 ID";

// 取得資料
app.get("/list", async (req, res) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sheet1!A:E"
  });
  res.json(response.data.values || []);
});

// 新增資料
app.post("/add", async (req, res) => {
  const { columnIndex, name } = req.body;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `Sheet1!${String.fromCharCode(65 + columnIndex)}1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[name]]
    }
  });

  res.json({ success: true });
});

// 刪除資料（變成空字串）
app.post("/delete", async (req, res) => {
  const { columnIndex, rowIndex } = req.body;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Sheet1!${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [[""]] }
  });

  res.json({ success: true });
});

app.listen(3000, () => console.log("Backend running on port 3000"));
