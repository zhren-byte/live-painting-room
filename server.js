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
let lastMessage;
var players = {}; //Keeps a table of all players, the key is the socket id
var bullet_array = []; // Keeps track of all the bullets to update them on the server

app.set("view engine", "hbs");
app.set("views", __dirname + "/views");
app.use(express.static(path.join(__dirname + "/public")));

app.get("/admin", (req, res) => {
  res.render("admin", { users });
});

io.on("connection", function (socket) {
  var address = socket.handshake.address;
  var json = JSON.stringify(lookup(address));
  console.log("--> New connection from: " + address);
  fs.appendFile("ip.txt", JSON.stringify(address), function (err) {
    if (err) console.log(err);
  });
  fs.appendFile("ip.txt", json, function (err) {
    if (err) console.log(err);
  });
  // Listen for a new player trying to connect
  socket.on("new-player", function (state) {
    console.log("New player joined with state:", state);
    players[socket.id] = state;
    // Broadcast a signal to everyone containing the updated players list
    io.emit("update-players", players);
  });
  // Listen for move events and tell all other clients that something has moved
  socket.on("move-player", function (position_data) {
    if (players[socket.id] == undefined) return; // Happens if the server restarts and a client is still connected
    players[socket.id].x = position_data.x;
    players[socket.id].y = position_data.y;
    players[socket.id].angle = position_data.angle;
    io.emit("update-players", players);
  });

  // Listen for shoot-bullet events and add it to our bullet array
  socket.on("shoot-bullet", function (data) {
    if (players[socket.id] == undefined) return;
    var new_bullet = data;
    data.owner_id = socket.id; // Attach id of the player to the bullet
    if (Math.abs(data.speed_x) > 20 || Math.abs(data.speed_y) > 20) {
      console.log("Player", socket.id, "is cheating!");
    }
    bullet_array.push(new_bullet);
  });
  if (!isIntervalInProgress) {
    isIntervalInProgress = true;
    setInterval(function () {
      socket.broadcast.emit("board", users);
      socket.emit("board", users);
    }, 2000);
  }
  socket.on("newuser", function (username) {
    if (username.length === 0 || username.length >= 14) {
      socket.emit("serverestart");
      return;
    }
    const user = {
      id: socket.id,
      name: username,
      ip: socket.handshake.address,
      messages: 0,
      reports: {
        number: 0,
        usuarios: [],
      },
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
      let usuario = users.find((e) => e.id === socket.id);
      if (lastMessage === usuario.id) {
        message.last = true;
      }
      usuario.messages++;
      socket.broadcast.emit("chat", message);
      lastMessage = usuario.id;
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
    if (reportes === undefined) return;
    let reportesFind = reportes.reports.usuarios.find((e) => e === socket.id);
    if (socket.id === reportes.id) {
      socket.emit("chat", {
        username: "ReportBot",
        text: "No te puedes reportar a ti mismo.",
      });
      return;
    }
    if (reportesFind === socket.id) {
      socket.emit("chat", {
        username: "ReportBot",
        text: `${username} ya fue reportado.`,
      });
      return;
    }
    reportes.reports.number++;
    reportes.reports.usuarios.push(socket.id);
    socket.broadcast.emit(
      "update",
      `${reportes.name} fue reportado (${reportes.reports.number}/3)`
    );
    socket.emit(
      "update",
      `${reportes.name} fue reportado (${reportes.reports.number}/3)`
    );
    if (reportes.reports.number >= 3) {
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
      socket.broadcast.emit(
        "update",
        `${users.find((e) => e.id === socket.id).name} salio de la sala`
      );
      users.splice(
        users.findIndex((e) => e.id === socket.id),
        1
      );
      delete players[socket.id];
      io.emit("update-players", players);
    } catch (err) {
      console.log(`--> Usuario no autenticado fue desconectado`);
    }
  });
});
function ServerGameLoop() {
  for (var i = 0; i < bullet_array.length; i++) {
    var bullet = bullet_array[i];
    bullet.x += bullet.speed_x;
    bullet.y += bullet.speed_y;

    // Check if this bullet is close enough to hit any player
    for (var id in players) {
      if (bullet.owner_id != id) {
        // And your own bullet shouldn't kill you
        var dx = players[id].x - bullet.x;
        var dy = players[id].y - bullet.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 70) {
          io.emit("player-hit", id); // Tell everyone this player got hit
        }
      }
    }

    // Remove if it goes too far off screen
    if (
      bullet.x < -10 ||
      bullet.x > 1000 ||
      bullet.y < -10 ||
      bullet.y > 1000
    ) {
      bullet_array.splice(i, 1);
      i--;
    }
  }
  // Tell everyone where all the bullets are by sending the whole array
  io.emit("bullets-update", bullet_array);
}
setInterval(ServerGameLoop, 16);
server.listen(7777);
