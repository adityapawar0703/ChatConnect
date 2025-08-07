// ai/botHandler.js
const axios = require("axios");

const SYSTEM_MESSAGE = "You're a friendly AI agent in a random anonymous video chat room.";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const startAIBotChat = (socket, io, waitingusers, pairedUsers, aiConversations) => {
  // Remove from waiting list
  const index = waitingusers.findIndex(s => s.id === socket.id);
  if (index !== -1) waitingusers.splice(index, 1);

  const roomname = `ai-${socket.id}`;
  socket.join(roomname);

  // Use user message as system message since Gemini doesn't support 'system' role
  aiConversations.set(socket.id, [
    { role: "user", content: SYSTEM_MESSAGE }
  ]);

  io.to(socket.id).emit("joined", {
    roomname,
    opponentName: "AI Agent 🤖",
    opponentImg: "/images/ai-bot.png"
  });
   var aiMessage = `Hi! I'm an AI agent chatting while we wait for someone to join. Ask me anything!`;
  io.to(socket.id).emit("message",  aiMessage);

  console.log("✅ AI bot started for:", socket.userName, "Room:", roomname);

  pairedUsers.set(socket.id, "AI");
};

const getGeminiReply = async (history) => {
  try {
    const contents = history.map(m => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const replyParts = response.data?.candidates?.[0]?.content?.parts;

    if (Array.isArray(replyParts)) {
      const reply = replyParts.map(p => p.text).join("\n").trim();
      return reply;
    }

    return "I'm not sure how to reply to that.";
  } catch (err) {
    console.error("❌ Gemini error:", err.response?.data || err.message);
    return "Sorry, I had a problem thinking of a reply.";
  }
};

module.exports = {
  startAIBotChat,
  getGeminiReply
};
