require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL;
const AI_MODEL = process.env.AI_MODEL;

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "DarkGPT AI",
    configured: Boolean(AI_API_KEY && AI_BASE_URL && AI_MODEL),
    node: process.version
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Bạn chưa gửi nội dung chat."
      });
    }

    if (!AI_API_KEY || !AI_BASE_URL || !AI_MODEL) {
      return res.status(500).json({
        error: "Server thiếu AI_API_KEY, AI_BASE_URL hoặc AI_MODEL trong Environment."
      });
    }

    // Chuẩn hóa URL API
    const baseURL = AI_BASE_URL.replace(/\/+$/, "");
    const apiURL = baseURL.endsWith("/chat/completions")
      ? baseURL
      : `${baseURL}/chat/completions`;

    // Chỉ nhận các role hợp lệ
    const cleanMessages = messages
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .map(m => ({
        role: m.role,
        content: m.content
      }));

    if (cleanMessages.length === 0) {
      return res.status(400).json({
        error: "Tin nhắn không hợp lệ."
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let response;

    try {
      response = await fetch(apiURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AI_API_KEY}`
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content: `Bạn là DarkGPT AI, trợ lý lập trình.
Trả lời bằng tiếng Việt, rõ ràng và hữu ích.
Có thể hỗ trợ HTML, CSS, JavaScript, Python, C, C++,
C#, Java, Swift, Node.js, API, sửa lỗi và phát triển ứng dụng.
Khi người dùng yêu cầu viết code, hãy cung cấp code đầy đủ,
đặt trong code block, nêu tên file và hướng dẫn chạy.
Không tự ý lược bỏ các phần quan trọng của code.
Nếu thiếu thông tin, hãy nói rõ phần nào cần bổ sung.`
            },
            ...cleanMessages
          ],
          temperature: 0.7
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    // Đọc phản hồi API
    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("AI API trả về dữ liệu không phải JSON:", rawText);
      return res.status(502).json({
        error: "Nhà cung cấp AI trả về dữ liệu không hợp lệ."
      });
    }

    if (!response.ok) {
      const apiError =
        data?.error?.message ||
        data?.message ||
        `AI API lỗi HTTP ${response.status}`;

      console.error("AI API Error:", response.status, apiError);

      return res.status(response.status).json({
        error: apiError
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      console.error("AI response thiếu nội dung:", data);

      return res.status(502).json({
        error: "AI không trả về nội dung. Hãy kiểm tra model hoặc API."
      });
    }

    return res.json({ reply });

  } catch (error) {
    console.error("Chat server error:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "AI phản hồi quá lâu, vui lòng thử lại."
      });
    }

    return res.status(500).json({
      error: "Server không kết nối được AI. Hãy kiểm tra API URL và cấu hình."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DarkGPT AI đang chạy tại port ${PORT}`);
});
