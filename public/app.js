const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const messagesEl = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const sidebar = document.getElementById("sidebar");

let messages = [];
let busy = false;

function addMessage(role, content) {
  const item = document.createElement("div");
  item.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  // Render as plain text to avoid injecting untrusted HTML.
  bubble.textContent = content;

  item.appendChild(bubble);
  messagesEl.appendChild(item);

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function saveHistory() {
  try {
    localStorage.setItem("darkgpt-history", JSON.stringify(messages));
  } catch {}
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem("darkgpt-history") || "[]");

    if (Array.isArray(saved)) {
      messages = saved;
      messages.forEach(m => addMessage(m.role, m.content));
    }
  } catch {}
}

function newChat() {
  messages = [];
  messagesEl.replaceChildren();
  welcome.style.display = "block";
  localStorage.removeItem("darkgpt-history");
  input.focus();
}

async function sendMessage(text) {
  if (busy || !text.trim()) return;

  busy = true;
  sendBtn.disabled = true;

  const content = text.trim();

  welcome.style.display = "none";

  messages.push({
    role: "user",
    content
  });

  addMessage("user", content);
  saveHistory();

  input.value = "";

  const loading = document.createElement("div");
  loading.className = "message assistant";

  const loadingBubble = document.createElement("div");
  loadingBubble.className = "bubble";
  loadingBubble.textContent = "AI đang suy nghĩ...";
  loading.appendChild(loadingBubble);

  messagesEl.appendChild(loading);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages.slice(-30)
      })
    });

    const data = await response.json();

    loading.remove();

    if (!response.ok) {
      throw new Error(data.error || "API error");
    }

    const reply = data.reply || "AI không trả lời.";

    messages.push({
      role: "assistant",
      content: reply
    });

    addMessage("assistant", reply);
    saveHistory();
  } catch (error) {
    loadingBubble.textContent = "Lỗi: " + error.message;
  } finally {
    busy = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

sendBtn.addEventListener("click", () => {
  sendMessage(input.value);
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(input.value);
  }
});

document.getElementById("newChat").addEventListener("click", newChat);

document.getElementById("menuBtn").addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt;
    input.focus();
  });
});

document.querySelectorAll(".chips button").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

loadHistory();
