const express = require("express");
const app = express();
require('dotenv').config();

// const fetch = require('node-fetch'); 
const indexRouter = require("./routes/index");
const path = require("path");

const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
const io = socketIO(server);
const sendEmail = require('./config.js/email')
const { startAIBotChat, getGeminiReply } = require('./config.js/botHandlerFunc');
let waitingusers = [];
let rooms = {};

let pairedUsers = new Map(); // key: socket.id, value: partner's socket.id
//  trial for AI bot with history trial 3
const aiConversations = new Map(); // key: socket.id → array of message history

io.on("connection", function (socket) {
  socket.on("joinroom", function ({ userName, userImg }) {
    socket.userName = userName;
    socket.userImg = userImg;

    if (waitingusers.length > 0) {
      let partner = waitingusers.shift();
      const roomname = `${socket.id}-${partner.id}`;

      socket.join(roomname);
      partner.join(roomname);

      // Track pairing
      pairedUsers.set(socket.id, partner.id);
      pairedUsers.set(partner.id, socket.id);

      // Send each user the data of their partner
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

      console.log("Room created:", roomname, "users:", socket.userName, partner.userName);
    } else {

      if (waitingusers.length === 0) {
        // trial if anyone joins if no one is there email me
        // sendEmail(userName || "Anonymous");
        console.log("📩 Email sent: someone is waiting");
      }     
      waitingusers.push(socket);

      setTimeout(() => {
        if (waitingusers.includes(socket)) {
          startAIBotChat(socket, io, waitingusers, pairedUsers, aiConversations);
        }
      }, 12000);
    }
  });
   
  socket.on("signalingMessage", function (data) {
    socket.broadcast.to(data.room).emit("signalingMessage", data.message);
  });

  // socket.on("message", function (data) {
  //   socket.broadcast.to(data.room).emit("message", data.message);
  // });
   socket.on("message", async function (data) {
  const { room, message } = data;
  const partnerId = pairedUsers.get(socket.id);

  // ✅ AI chat
  if (partnerId === "AI") {
    const history = aiConversations.get(socket.id) || [];
    history.push({ role: "user", content: message });

    const reply = await getGeminiReply(history);

    history.push({ role: "model", content: reply });
    aiConversations.set(socket.id, history);

    // ✅ Send only string, as expected by client
    io.to(socket.id).emit("message", reply);

    console.log("🧠 AI Reply sent:", reply);
    return;
  }

  // ✅ User-to-user message — also send only string
  socket.broadcast.to(room).emit("message", message);
});


  // socket.on("message", function (data) {
  //   socket.broadcast.to(data.room).emit("message", data.message);
  // });
  socket.on("startVideoCall", function ({ room }) {
    socket.broadcast.to(room).emit("incomingCall");
  });

  socket.on("rejectCall", function ({ room }) {
    socket.broadcast.to(room).emit("callRejected");
  });

  socket.on("acceptCall", function ({ room }) {
    socket.broadcast.to(room).emit("callAccepted");
  });

  socket.on("disconnect", function () {
    console.log("User disconnected:", socket.id);

    // Remove from waiting list
    const index = waitingusers.findIndex((u) => u.id === socket.id);
    if (index !== -1) {
      waitingusers.splice(index, 1);
    }

    // If user was paired, disconnect the partner
    const partnerId = pairedUsers.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit("partner-disconnected");
        partnerSocket.disconnect(true);
      }

      pairedUsers.delete(socket.id);
      pairedUsers.delete(partnerId);
    }
  });
});

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


app.use("/", indexRouter);

server.listen(process.env.PORT || 3000);
console.log("Server is running on port 3000");
