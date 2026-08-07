// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// ============================================================
//  БЭКЕНД НЕМЕЗИС АЙ
// ============================================================

const AGNES_API_KEY = "sk-9OBSttI1TxXspLMDenWdnk5nfuzJsRXAHvvI5fCO18SOZVj0";
const AGNES_URL = "https://apihub.agnes-ai.com/v1/chat/completions";

// Системный промпт с рассуждениями
const SYSTEM_PROMPT = `
  Ты — Nemesis AI, продвинутый ассистент.

  **1. Рассуждения (Chain of Thought)**
  - Сначала ПРОАНАЛИЗИРУЙ вопрос пользователя.
  - ОПИШИ свои рассуждения и шаги к решению задачи.
  - Только после этого ДАЙ окончательный ответ.

  **2. Поиск информации**
  - Если вопрос требует актуальных данных, используй свои знания.
  - Если данных нет — скажи это честно.

  **3. Правила**
  - Ты — Nemesis AI, не представляйся как другая модель.
  - Отвечай на русском языке.
  - Не пиши вредоносный код.
`;

// Роли
function permsForRole(role) {
  switch (role) {
    case "nemesis": return { model: "agnes-2.0-flash", maxTokens: 4000, canVision: true };
    case "ai_max": return { model: "agnes-2.0-flash", maxTokens: 4000, canVision: true };
    case "ai_basic": return { model: "agnes-2.0-flash", maxTokens: 2000, canVision: true };
    default: return { model: "agnes-2.0-flash-lite", maxTokens: 500, canVision: false };
  }
}

// ===== /chat — стримит ответ ИИ =====
exports.chat = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const { messages, imageUrl, uid, role } = req.body || {};
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Пустое сообщение" });
    }

    const perms = permsForRole(role || "free");

    if (imageUrl && !perms.canVision) {
      return res.status(403).json({ error: "Ваш тариф не поддерживает фото" });
    }

    let formatted = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
    
    if (imageUrl) {
      const last = messages[messages.length - 1];
      formatted = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(0, -1),
        {
          role: "user",
          content: [
            { type: "text", text: last.content },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ];
    }

    const upstream = await fetch(AGNES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGNES_API_KEY}`,
      },
      body: JSON.stringify({
        model: perms.model,
        messages: formatted,
        max_tokens: perms.maxTokens,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: "Ошибка AI API" });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const chunk = json.choices?.[0]?.delta?.content || "";
          if (chunk) res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        } catch (_) {}
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Внутренняя ошибка" });
    } else {
      res.end();
    }
  }
});

// ===== /uploadImage — загрузка фото =====
exports.uploadImage = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "Нет изображения" });
    }

    const form = new URLSearchParams();
    form.append("source", imageBase64);
    form.append("format", "json");

    const r = await fetch(
      `https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5`,
      { method: "POST", body: form }
    );
    const data = await r.json();

    if (data.status_code === 200) {
      return res.json({ url: data.image.url });
    }
    return res.status(502).json({ error: "Ошибка загрузки фото" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Ошибка сервера" });
  }
});
