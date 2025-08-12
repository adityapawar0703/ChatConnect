const express = require("express");
const app = express();
require('dotenv').config();
const path = require("path");
const indexRouter = require("./routes/index");


const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
const io = socketIO(server);

const sendEmail = require('./config.js/email'); // should export a function
const { startAIBotChat, getGeminiReply } = require('./config.js/botHandlerFunc');



app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/", indexRouter);


let waitingusers = []; // array of socket objects waiting for a real partner
let pairedUsers = new Map(); // socket.id => partner socket.id or "AI"
let aiConversations = new Map(); // socket.id => conversation history (for AI)
let aiSessions = new Map(); // realUserSocket.id => { startedAt: timestamp }  (tracks users currently talking to AI)
var activeUsers = 0;
// helper: remove socket from waitingusers
function removeFromWaiting(socket) {
  const idx = waitingusers.findIndex(u => u.id === socket.id);
  if (idx !== -1) waitingusers.splice(idx, 1);
}

// helper: find a real user who currently has AI session (we pick the earliest)
function pickAnAISessionUser() {
  for (const [realUserId] of aiSessions.entries()) {
    const s = io.sockets.sockets.get(realUserId);
    if (s) return s;
    
    aiSessions.delete(realUserId);
  }
  return null;
}

// ---------------- Socket logic ----------------
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
    activeUsers++;
    io.emit("updateUserCount", activeUsers); 
    console.log(`User connected. Active users: ${activeUsers}`);

  socket.on("joinroom", ({ userName, userImg }) => {
    socket.userName = userName || "Anonymous";
    socket.userImg = userImg || "";

    console.log(`joinroom: ${socket.userName} (${socket.id})`);

    // 1) If there's any real user currently chatting with AI, pair new user with them immediately
    const aiUserSocket = pickAnAISessionUser();
    if (aiUserSocket) {
      // socket.emit("switchToRealUser", {
      //   partnerName: aiUserSocket.userName,
      //   partnerImg: aiUserSocket.userImg
      // });
      io.to(aiUserSocket.id).emit("switchToRealUser");
      console.log(`Found existing AI session , and we are  replaceing : AI-user ${aiUserSocket.id} -> pairing with new user ${socket.id}`);

      // Clean up AI state for aiUserSocket
      aiConversations.delete(aiUserSocket.id);
      aiSessionsDeleteSafe(aiUserSocket.id); // helper below
      // ensure aiUserSocket is removed from waitingusers if present
      removeFromWaiting(aiUserSocket);

      // Pair aiUserSocket (real user who had AI) with this incoming socket (new real user)
      const roomname = `${aiUserSocket.id}-${socket.id}`;
      aiUserSocket.join(roomname);
      socket.join(roomname);

      // Set pairing
      pairedUsers.set(aiUserSocket.id, socket.id);
      pairedUsers.set(socket.id, aiUserSocket.id);

      // Notify both
      io.to(aiUserSocket.id).emit("joined", {
        roomname,
        opponentName: socket.userName,
        opponentImg: socket.userImg
      });
      io.to(socket.id).emit("joined", {
        roomname,
        opponentName: aiUserSocket.userName,
        opponentImg: aiUserSocket.userImg
      });

      console.log(`✅ Switched AI-user ${aiUserSocket.userName} (${aiUserSocket.id}) to real user ${socket.userName} (${socket.id})`);
      return;
    }

    // 2) No AI sessions to replace — if there's a waiting real user, pair them
    if (waitingusers.length > 0) {
      const partner = waitingusers.shift();

      // cleanup any AI state for partner (in case)
      if (pairedUsers.get(partner.id) === "AI") {
        aiConversations.delete(partner.id);
        aiSessionsDeleteSafe(partner.id);
      }

      const roomname = `${socket.id}-${partner.id}`;
      socket.join(roomname);
      partner.join(roomname);

      pairedUsers.set(socket.id, partner.id);
      pairedUsers.set(partner.id, socket.id);

      io.to(socket.id).emit("joined", {
        roomname,
        opponentName: partner.userName,
        opponentImg: partner.userImg,
      });

      io.to(partner.id).emit("joined", {
        roomname,
        opponentName: socket.userName,
        opponentImg: socket.userImg,
      });

      console.log(`Room created: ${roomname} users: ${socket.userName}, ${partner.userName}`);
      return;
    }

    // 3) No session of Ai present 
    console.log(`${socket.userName} is the first waiting user — added to queue.`);
    waitingusers.push(socket);

   
    try {
      if (typeof sendEmail === "function") {
        // sendEmail(socket.userName);
        console.log("📩 Sent notification email (sendEmail called).");
      }
    } catch (e) {
      console.warn("Failed to call sendEmail:", e.message || e);
    }

    // schedule AI fallback after configured delay (only start AI if still waiting and not paired)
    setTimeout(() => {
      // still waiting and not paired
      if (waitingusers.includes(socket) && !pairedUsers.get(socket.id)) {
        console.log(`No partner after timeout. Starting AI for ${socket.userName} (${socket.id})`);
        // start AI chat and track session
        startAIBotChat(socket, io, waitingusers, pairedUsers, aiConversations);
        pairedUsers.set(socket.id, "AI");
        aiSessions.set(socket.id, { startedAt: Date.now() });
      }
    }, 15000);
  });


  socket.on("signalingMessage", (data) => {
    socket.broadcast.to(data.room).emit("signalingMessage", data.message);
  });

  // message handler
  socket.on("message", async (data) => {
    
    const { room, message } = data;
    const partnerId = pairedUsers.get(socket.id);

    // if chatting with AI
    if (partnerId === "AI") {
      const history = aiConversations.get(socket.id) || [];
      history.push({ role: "user", content: message });

      const reply = await getGeminiReply(history);

      history.push({ role: "model", content: reply });
      aiConversations.set(socket.id, history);

      // send plain string to client (your client expects string)
      io.to(socket.id).emit("message", reply);
      console.log(`🧠 AI Reply sent to ${socket.userName}:`, reply);
      return;
    }

    // normal user-user chat
    socket.broadcast.to(room).emit("message", message);
  });

  // video call events (unchanged)
  socket.on("startVideoCall", ({ room }) => {
    socket.broadcast.to(room).emit("incomingCall");
  });
  socket.on("rejectCall", ({ room }) => {
    socket.broadcast.to(room).emit("callRejected");
  });
  socket.on("acceptCall", ({ room }) => {
    socket.broadcast.to(room).emit("callAccepted");
  });

  

  // disconnect handler
  socket.on("disconnect", () => {
      activeUsers--;
        io.emit("updateUserCount", activeUsers);
        console.log(`User disconnected. Active users: ${activeUsers}`);
    console.log("User disconnected:", socket.id);
   
    removeFromWaiting(socket);
    const partnerId = pairedUsers.get(socket.id);
    // if (partnerId && partnerId !== "AI") {
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
       
        partnerSocket.emit("partner-disconnected");
        try { partnerSocket.disconnect(true); } catch(e) { 
          console.log("error in line 219:", e);
        }
      }
      pairedUsers.delete(partnerId);
       pairedUsers.delete(socket.id);
    }

    if (aiSessions.has(socket.id)) {
      aiSessions.delete(socket.id);
      aiConversations.delete(socket.id);
    }

    pairedUsers.delete(socket.id);
    aiConversations.delete(socket.id);
  });
});

//  delete the AI session in queue
function aiSessionsDeleteSafe(socketId) {
  if (aiSessions.has(socketId)) {
    aiSessions.delete(socketId);
  }
}

server.listen(process.env.PORT || 3000, () => {
  console.log("Server is running on port", process.env.PORT || 3000);
});
