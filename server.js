// ========================================================
// FoodLog サーバー統合版
// ========================================================
import express from "express";
import cors from "cors";
import fs from "fs";
import session from "express-session";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("./"));

// --------------------------------------------------------
// セッション設定
// --------------------------------------------------------
app.use(
  session({
    secret: "foodlog-secret-key", // セッション識別用キー
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 有効期限1時間
  })
);

// --------------------------------------------------------
// 定義
// --------------------------------------------------------
const DATA_PATH = "./foods.json";
const USER_PATH = "./users.json";
const PORT = 3000;

// OpenAI 設定
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------------------------------------------------------
// ユーザー登録・ログイン管理
// --------------------------------------------------------

// --- 新規登録 ---
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "未入力があります" });

  let users = {};
  if (fs.existsSync(USER_PATH))
    users = JSON.parse(fs.readFileSync(USER_PATH, "utf8"));

  if (users[username])
    return res.status(400).json({ error: "そのユーザー名は既に存在します" });

  users[username] = password;
  fs.writeFileSync(USER_PATH, JSON.stringify(users, null, 2));
  res.json({ ok: true, message: "登録完了" });
});

// --- ログイン ---
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "未入力があります" });

  let users = {};
  if (fs.existsSync(USER_PATH))
    users = JSON.parse(fs.readFileSync(USER_PATH, "utf8"));

  if (!users[username] || users[username] !== password)
    return res.status(401).json({ error: "ユーザー名またはパスワードが違います" });

  req.session.user = { name: username };
  res.json({ ok: true, message: "ログイン成功" });
});

// --- ログアウト ---
app.post("/api/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("セッション破棄に失敗:", err);
        return res.status(500).json({ error: "ログアウトに失敗しました" });
      }
      res.clearCookie("connect.sid");
      res.json({ ok: true, message: "ログアウトしました" });
    });
  } else {
    res.json({ ok: true });
  }
});

// --------------------------------------------------------
// 食材データ管理
// --------------------------------------------------------

// --- 食材一覧取得 ---
app.get("/api/foods", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "未ログインです" });

  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, "[]");
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  res.json(data);
});

// --- 食材データ保存 ---
app.post("/api/foods", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "未ログインです" });

  const data = req.body;
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  res.json({ status: "ok" });
});

// --------------------------------------------------------
// AIレシピ提案
// --------------------------------------------------------
app.post("/api/recipe", async (req, res) => {
  const { ingredients, style } = req.body;
  if (!ingredients?.length)
    return res.status(400).json({ error: "食材を入力してください" });

  const styleHints = {
    washoku: "出汁や味噌を使った日本の家庭料理。",
    yoshoku: "洋風のソースやバターを使った料理。",
    chuka: "高火力で炒める中華料理。",
    italian: "オリーブオイルやトマトを使った料理。",
    soup: "汁物・スープ系の料理。",
    stirfry: "簡単にできる炒め物。",
    nimono: "煮込んで味を染み込ませる料理。",
    agemono: "衣をつけて揚げる料理。",
  };

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      messages: [
        { role: "system", content: "あなたは料理研究家です。" },
        {
          role: "user",
          content: `以下の食材を使って${styleHints[style] || "家庭料理"}を1品提案してください。
出力形式はJSON形式で統一してください。
{
  "title": "料理名",
  "ingredients": ["材料1", "材料2", ...],
  "steps": ["手順1", "手順2", ...],
  "tips": ["ポイント1", "ポイント2"]
}
食材: ${ingredients.join(", ")}`
        },
      ],
    });

    const text = response.choices[0].message.content;
    const jsonStart = text.indexOf("{");
    const jsonText = text.slice(jsonStart).trim();
    const recipe = JSON.parse(jsonText);

    res.json({ ok: true, recipe });
  } catch (err) {
    console.error("AIレシピ生成エラー:", err);
    res.status(500).json({ ok: false, error: "AIレシピ生成に失敗しました" });
  }
});

// --------------------------------------------------------
// サーバー起動
// --------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
