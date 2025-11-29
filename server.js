import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/recipe", async (req, res) => {
  const { ingredients } = req.body;
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "あなたは冷蔵庫の食材からレシピを考える料理アシスタントです。" },
        { role: "user", content: `次の食材で作れるレシピを3つ提案して: ${ingredients.join(", ")}` }
      ],
    });
    res.json({ result: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("🚀 サーバー起動！ → http://localhost:3000"));
