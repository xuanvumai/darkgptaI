"use strict";

const $ = (id) => document.getElementById(id);

const input = $("input");
const sendBtn = $("sendBtn");
const messagesEl = $("messages");
const welcome = $("welcome");
const newChatBtn = $("newChat");
const menuBtn = $("menuBtn");
const sidebar = $("sidebar");

let chatMessages = [];
let isSending = false;

const SYSTEM_MESSAGE = {
  role: "system",
  content: "Bạn là AI trợ lý lập trình. Trả lời bằng tiếng Việt. Khi người dùng yêu cầu viết code, hãy viết code đầy đủ, rõ tên file, không tự ý bỏ phần quan trọng và hướng dẫn chạy."
};

function scrollToBottom() {
  window.scrollTo(0, document.body.scrollHeight);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function createBubble(role, content) {
  const row = document.createElement("div");
  row.className = `message-row ${role === "user" ? "user-row" : "ai-row"}`;

  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${role === "user" ? "user-bubble" : "ai-bubble"}`;

  // Hiển thị code block an toàn, không chạy HTML do AI trả về
  const parts = String(content).split(/```/);

  parts.forEach((part, index) => {
    if (!part) return;

    if (index % 2 === 1) {
      const code = document.createElement("pre");
      code.className = "code-block";

      const codeEl = document.createElement("code");
      codeEl.textContent = part.replace(/^[a-zA-Z0-9+#.-]*\n/, "");

      code.appendChild(codeEl);
      bubble.appendChild(code);
    } else {
      const text = document.createElement("div");
      text.className = "message-text";
      text.textContent = part;
      bubble.appendChild(text);
    }
  });

  row.appendChild(bubble);
  messagesEl.appendChild(row);

  scrollToBottom();
  return row;
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "message-row ai-row";
  row.id = "typingIndicator";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble ai-bubble";
  bubble.textContent = "AI đang suy nghĩ…";

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollToBottom();
}

function removeTyping() {
  const el = $("typingIndicator");
  if (el) el.remove();
}

function setSending(value) {
  isSending = value;
  sendBtn.disabled = value;
  sendBtn.textContent = value ? "…" : "➤";
}

async function sendMessage(text) {
  text = String(text || "").trim();

  if (!text || isSending) return;

  chatMessages.push({
    role: "user",
    content: text
  });

  createBubble("user", text);

  input.value = "";
  input.style.height = "auto";

  if (welcome) welcome.style.display = "none";

  setSending(true);
  showTyping();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 70000);

    let response;

    try {
      response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: chatMessages
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    const data = await response.json().catch(() => ({}));

    removeTyping();

    if (!response.ok) {
      throw new Error(data.error || `Lỗi HTTP ${response.status}`);
    }

    if (!data.reply || typeof data.reply !== "string") {
      throw new Error("Server không gửi nội dung trả lời.");
    }

    chatMessages.push({
      role: "assistant",
      content: data.reply
    });

    createBubble("assistant", data.reply);

  } catch (error) {
    removeTyping();

    const errorText = error.name === "AbortError"
      ? "AI phản hồi quá lâu. Bạn hãy thử lại."
      : error.message || "Không kết nối được máy chủ AI.";

    createBubble("assistant", "⚠️ " + errorText);

    console.error("Chat error:", error);

  } finally {
    setSending(false);
    input.focus();
  }
}

// Nút gửi
sendBtn.addEventListener("click", () => {
  sendMessage(input.value);
});

// Enter để gửi, Shift + Enter để xuống dòng
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(input.value);
  }
});

// Tự điều chỉnh chiều cao ô nhập
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
});

// Prompt gợi ý trong giao diện
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.prompt || "";
    sendMessage(prompt);
  });
});

// Tạo cuộc trò chuyện mới
if (newChatBtn) {
  newChatBtn.addEventListener("click", () => {
    chatMessages = [];
    messagesEl.innerHTML = "";

    if (welcome) welcome.style.display = "";

    input.value = "";
    input.style.height = "auto";
    input.focus();

    if (sidebar) sidebar.classList.remove("open");
  });
}

// Menu mobile
if (menuBtn && sidebar) {
  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

// Menu navigation
document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    if (sidebar) sidebar.classList.remove("open");
  });
});

// Kiểm tra server khi mở web
fetch("/api/health")
  .then((res) => res.json())
  .then((data) => {
    console.log("DarkGPT server:", data);
  })
  .catch((err) => {
    console.error("Server health check failed:", err);
  });
