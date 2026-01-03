const API_BASE = "http://localhost:8000";

const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const typingEl = document.getElementById("typing");
const clearBtn = document.getElementById("clearChat");

let history = JSON.parse(localStorage.getItem("academi_history") || "[]");

// Initial render
history.forEach(msg => addBubble(msg.role, msg.content, false));

// Add a message bubble
function addBubble(role, content, animate = true) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role === "user" ? "user-msg" : "ai-msg"}`;
  if (!animate) bubble.style.animation = "none";

  const text = document.createElement("div");
  text.innerHTML = content;
  bubble.appendChild(text);

  // tools (copy)
  const tools = document.createElement("div");
  tools.className = "tools";
  const copyBtn = document.createElement("button");
  copyBtn.className = "btn btn-sm btn-outline-primary";
  copyBtn.textContent = "کپی";
  copyBtn.addEventListener("click", () => navigator.clipboard.writeText(text.innerText));
  tools.appendChild(copyBtn);
  bubble.appendChild(tools);

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Typing effect for AI reply
async function typeReply(content) {
  const bubble = document.createElement("div");
  bubble.className = "bubble ai-msg";

  const text = document.createElement("div");
  bubble.appendChild(text);

  // loader dots
  const loader = document.createElement("div");
  loader.className = "dots mt-2";
  loader.innerHTML = "<span></span><span></span><span></span>";
  bubble.appendChild(loader);

  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // simulate typing
  loader.remove();
  let i = 0;
  const timer = setInterval(() => {
    text.textContent = content.slice(0, i++);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    if (i > content.length) {
      clearInterval(timer);
      const tools = document.createElement("div");
      tools.className = "tools";
      const copyBtn = document.createElement("button");
      copyBtn.className = "btn btn-sm btn-outline-primary";
      copyBtn.textContent = "کپی";
      copyBtn.addEventListener("click", () => navigator.clipboard.writeText(content));
      tools.appendChild(copyBtn);
      bubble.appendChild(tools);
    }
  }, 12);
}

// Clear chat
clearBtn.addEventListener("click", () => {
  history = [];
  localStorage.removeItem("academi_history");
  chatWindow.innerHTML = "";
  userInput.value = "";
  userInput.focus();
});

// Send handler
sendBtn.addEventListener("click", handleUserRequest);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleUserRequest();
  }
});

async function handleUserRequest() {
  const prompt = userInput.value.trim();
  if (!prompt) return;

  addBubble("user", prompt);
  history.push({ role: "user", content: prompt });
  localStorage.setItem("academi_history", JSON.stringify(history));
  userInput.value = "";
  userInput.focus();

  typingEl.style.display = "block";
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history })
    });

    const data = await res.json();

    if (res.ok) {
      const reply = data.reply || "";
      await typeReply(reply);
      history.push({ role: "model", content: reply });
      localStorage.setItem("academi_history", JSON.stringify(history));
    } else {
      addBubble("model", `خطا: ${data.error || "Unknown error"}`);
    }
  } catch (err) {
    addBubble("model", "خطا در ارتباط با سرور");
  } finally {
    typingEl.style.display = "none";
    sendBtn.disabled = false;
  }
}
