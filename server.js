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
const hbs = require("hbs");

var isIntervalInProgress = false;
let users = [];

app.set("view engine", "hbs");
app.set("views", __dirname + "/views");
app.use(express.static(path.join(__dirname + "/public")));

app.get("/admin", (req, res) => {
  res.render("admin", { users });
});

io.on("connection", function (socket) {
  if (!isIntervalInProgress) {
    isIntervalInProgress = true;
    setInterval(function () {
      socket.broadcast.emit("board", users);
    }, 2000);
  }
  var address = socket.handshake.address;
  var json = JSON.stringify(lookup(address));
  console.log("--> New connection from: " + address);
  //console.log(lookup(address)); // location of the user
  fs.appendFile("ip.txt", JSON.stringify(address), function (err) {
    if (err) console.log(err);
  });
  fs.appendFile("ip.txt", json, function (err) {
    if (err) console.log(err);
  });
  socket.on("newuser", function (username) {
    if (username.length == 0 || username.length >= 14) {
      socket.emit("serverestart");
      return;
    }
    const user = {
      id: socket.id,
      name: username,
      ip: socket.handshake.address,
      messages: 0,
      reports: 0,
    };
    users.push(user);
    socket.broadcast.emit("update", username + " entro a la sala");
    console.log(
      `--> User: ${users.find((e) => e.id === socket.id).name} (${
        socket.handshake.address
      }) se conecto.`
    );
  });
  socket.on("exituser", function (username) {
    socket.disconnect();
  });
  socket.on("chat", function (message) {
    if (message.length == 0 || message.length >= 64) {
      return;
    }
    try {
      users.find((e) => e.id === socket.id).messages++;
      socket.broadcast.emit("chat", message);
    } catch (err) {
      socket.emit("serverestart");
    }
  });
  socket.on("drawing", (data) => socket.broadcast.emit("drawing", data));
  socket.on("clean", function () {
    console.log(users);
    socket.broadcast.emit("clean");
  });
  socket.on("reportuser", function (username) {
    let reportes = users.find((e) => e.name === username);
    reportes.reports++;
    socket.broadcast.emit("update", `${reportes.name} fue reportado (${reportes.reports}/3)`);
    socket.emit("update", `${reportes.name} fue reportado (${reportes.reports}/3)`);
    if (reportes.reports >= 3) {
      socket.to(reportes.id).emit("kick");
    }
  });
  socket.on("kickreceive", () => {
    socket.disconnect();
  });
  socket.on("disconnect", function () {
    try {
      console.log(
        `--> User: ${users.find((e) => e.id === socket.id).name} (${
          socket.handshake.address
        }) se desconecto.`
      );
      socket.broadcast.emit("update", `${users.find((e) => e.id === socket.id).name} salio de la sala`);
      users.splice(
        users.findIndex((e) => e.id === socket.id),
        1
      );
    } catch (err) {
      console.log(`--> Usuario no autenticado fue desconectado`);
    }
  });
});
server.listen(7777);
