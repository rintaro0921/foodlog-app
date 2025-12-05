// server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const DATA_PATH = "./foods.json";
const PORT = 3000;

// --- OpenAI設定 ---
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- データ取得 ---
app.get("/api/foods", (req, res) => {
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "[]");
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  res.json(data);
});

// --- データ保存 ---
app.post("/api/foods", (req, res) => {
  const data = req.body;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  res.json({ status: "ok" });
});

// --- AIレシピ提案 ---
app.post("/api/recipe", async (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients || ingredients.length === 0)
    return res.status(400).json({ error: "No ingredients provided" });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "あなたは料理研究家です。日本の家庭料理を中心に、余り物を使ったレシピを提案します。",
        },
        {
          role: "user",
          content: `以下の食材を使ったおすすめレシピを3つ提案してください。簡単に作れる家庭料理で、調味料も一般的なものにしてください。\n食材: ${ingredients.join(", ")}`,
        },
      ],
    });

    const text = response.choices[0].message.content.trim();
    res.json({ recipe: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AIレシピ生成に失敗しました" });
  }
});

// --- サーバー起動 ---
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
