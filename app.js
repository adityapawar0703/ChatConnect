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

let waitingusers = [];
let rooms = {};

io.on("connection", function (socket) {
  // socket.on("joinroom", function () {
  //   console.log("User joined room");
  //   if (waitingusers.length > 0) {
  //     let partner = waitingusers.shift();
  //     const roomname = `${socket.id}-${partner.id}`;

  //     socket.join(roomname);
  //     partner.join(roomname);

  //     io.to(roomname).emit("joined", roomname);
  //   } else {
  //     waitingusers.push(socket);
  //   }
  // });
  socket.on("joinroom", function ({ userName, userImg }) {
  socket.userName = userName;
  socket.userImg = userImg;

  if (waitingusers.length > 0) {
    let partner = waitingusers.shift();
    const roomname = `${socket.id}-${partner.id}`;

    socket.join(roomname);
    partner.join(roomname);

    // Send each user the data of their partner
    io.to(socket.id).emit("joined", {
      roomname,
      opponentName: partner.userName,
      opponentImg: partner.userImg
    });

    io.to(partner.id).emit("joined", {
      roomname,
      opponentName: socket.userName,
      opponentImg: socket.userImg
    });
    console.log("Room created:", roomname, "users:", socket.userName, partner.userName, "images:", socket.userImg, partner.userImg);

  } else {
    waitingusers.push(socket);
  }
});
  


  socket.on("signalingMessage", function (data) {
    socket.broadcast.to(data.room).emit("signalingMessage", data.message);
  });

  socket.on("message", function (data) {
    socket.broadcast.to(data.room).emit("message", data.message);
  });

  socket.on("startVideoCall", function ({ room }) {
    // sound effect pending
    socket.broadcast.to(room).emit("incomingCall");
  });

  socket.on("rejectCall", function ({ room }) {
    socket.broadcast.to(room).emit("callRejected");
  });

  socket.on("acceptCall", function ({ room }) {
    socket.broadcast.to(room).emit("callAccepted");
  });

  socket.on("disconnect", function () {
    let index = waitingusers.findIndex(
      (waitingUser) => waitingUser.id === socket.id
    );

    waitingusers.splice(index, 1);
  });
});

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


app.use("/", indexRouter);

server.listen(process.env.PORT || 3000);
console.log("Server is running on port 3000");
