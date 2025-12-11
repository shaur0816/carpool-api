import express from "express";
import cors from "cors";
import { google } from "googleapis";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// 你的 Google Sheet ID
const SHEET_ID = "1uLKFDFMMFEOstHybmdn61520vrzBGgwVgjF9EPygAag";

// Google API 驗證
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getSheet() {
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

/* -----------------------------
   1️⃣ 取得整份資料 list
-------------------------------- */
app.get("/list", async (req, res) => {
  try {
    const sheets = await getSheet();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "工作表1",
    });

    const rows = result.data.values || [];
    const cols = [[], [], [], [], []];

    rows.forEach(row => {
      row.forEach((cell, index) => {
        if (cell.trim()) cols[index].push(cell);
      });
    });

    res.json(cols);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   2️⃣ 新增姓名 add
-------------------------------- */
app.post("/add", async (req, res) => {
  const { columnIndex, name } = req.body;
  try {
    const sheets = await getSheet();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `工作表1!${String.fromCharCode(65 + columnIndex)}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[name]],
      },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------
   3️⃣ 刪除姓名 delete
-------------------------------- */
app.post("/delete", async (req, res) => {
  const { columnIndex, rowIndex } = req.body;

  try {
    const sheets = await getSheet();

    const col = String.fromCharCode(65 + columnIndex);
    const row = rowIndex + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `工作表1!${col}${row}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[""]],
      },
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
