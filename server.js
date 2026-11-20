require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "DarkGPT AI",
    node: process.version
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "messages phải là một mảng"
      });
    }

    if (!process.env.AI_API_KEY) {
      return res.status(500).json({
        error: "Chưa cấu hình AI_API_KEY trên server"
      });
    }

    const response = await fetch(
      `${process.env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.AI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL,
          messages: [
            {
              role: "system",
              content: `Bạn là DarkGPT AI Coding Assistant.
Hỗ trợ lập trình C, C++, C#, Lua, Python, Swift,
Java, JavaScript, Node.js, debugging, phân tích code,
reverse engineering trong phạm vi phù hợp, game development,
modding, server, API và nghiên cứu bảo mật.
Trả lời bằng tiếng Việt.
Khi viết code, ưu tiên code đầy đủ, có hướng dẫn chạy
và giải thích lỗi nếu có.`
            },
            ...messages
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "AI API request thất bại"
      });
    }

    res.json({
      reply: data.choices?.[0]?.message?.content || "AI không trả về nội dung."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Không thể kết nối AI server."
    });
  }
});

app.listen(PORT, () => {
  console.log(`DarkGPT AI chạy tại http://localhost:${PORT}`);
});
