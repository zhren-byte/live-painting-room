const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
const { lookup } = require("geoip-lite");
const router = express.Router();
let users = [];


app.use(express.static(path.join(__dirname + "/public")));

io.on("connection", function (socket) {
  var address = socket.handshake.address;
  var json = JSON.stringify(lookup(address));
  console.log("New connection from: " + address);
  //console.log(lookup(address)); // location of the user
  fs.appendFile("ip.txt", json, function (err) {
    if (err) console.log(err);
  });
  fs.appendFile("ip.txt", JSON.stringify(address), function (err) {
    if (err) console.log(err);
  });
  socket.on("newuser", function (username) {
    users.push(username);
    socket.broadcast.emit("update", username + " entro al chat");  
    socket.broadcast.emit("board", users);
    console.log(users);
  });
  socket.on("exituser", function (username) {
    socket.broadcast.emit("update", username + " salio del chat");
  });
  socket.on("chat", function (message) {
    socket.broadcast.emit("chat", message);
  });
  socket.on("drawing", (data) => socket.broadcast.emit("drawing", data));
  socket.on("clean", function () {
    socket.broadcast.emit("clean");
  });
});
server.listen(7777);
