(function () {
  window.addEventListener("beforeunload", (evento) => {
    if (true) {
      evento.preventDefault();
      evento.returnValue = "";
      return "";
    }
  });
  const app = document.querySelector(".app");
  const socket = io();
  socket.on("serverestart", function () {
    window.location.href = window.location.href;
  });
  let uname;
  const prefix = "/";
  function sendMessage() {
    let message = app.querySelector(".chat-screen #message-input").value;
    if (message.length == 0 || message.length >= 64) {
      return;
    }
    const args = message.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();
    if (message.startsWith(prefix)) {
      socket.emit(cmd, args[0]);
    } else {
      renderMessage("my", {
        username: uname,
        text: message,
      });
      socket.emit("chat", {
        username: uname,
        text: message,
        last: false,
      });
    }
    app.querySelector(".chat-screen #message-input").value = "";
  }
  app
    .querySelector(".join-screen #join-user")
    .addEventListener("click", function () {
      let username = app.querySelector(".join-screen #username").value;
      if (username.length == 0 || username.length >= 14) {
        return;
      }
      socket.emit("newuser", username);
      uname = username;
      app.querySelector(".join-screen").classList.remove("active");
      app.querySelector(".chat-screen").classList.add("active");
      app.querySelector("#pintura").classList.add("active");
      // requestAndShowPermission();
    });
  app
    .querySelector(".chat-screen #send-message")
    .addEventListener("click", sendMessage);
  app
    .querySelector(".chat-screen #exit-chat")
    .addEventListener("click", function () {
      socket.emit("exituser", uname);
      window.location.href = window.location.href;
    });
  document.addEventListener("keypress", function (e) {
    if (e.key == "Enter") {
      sendMessage();
    }
  });
  socket.on("board", function (users) {
    renderBoard(users);
  });
  socket.on("update", function (update) {
    renderMessage("update", update);
  });
  socket.on("chat", function (message) {
    renderMessage("other", message);
  });
  socket.on("kick", () => {
    socket.emit("kickreceive");
  });
  function renderBoard(user) {
    let boardContainer = app.querySelector(".userboard");
    boardContainer.innerHTML = "";
    for (let i = 0; i < user.length; i++) {
      let el = document.createElement("div");
      el.setAttribute("class", "user");
      if (user[i].name == uname) {
        el.setAttribute("class", "user my");
        el.innerHTML = `
        <div class="messages">${user[i].messages}</div>
        <div class="messages">${user[i].reports.number}</div>
            <div class="name">${user[i].name}</div>
        `;
        boardContainer.appendChild(el);
      }
      el.innerHTML = `
      <div class="messages">${user[i].messages}</div>
      <div class="messages">${user[i].reports.number}</div>
          <div class="name">${user[i].name}</div>
      `;
      boardContainer.appendChild(el);
    }
  }
  function renderMessage(type, message) {
    let messageContainer = app.querySelector(".chat-screen .messages");
    if (type == "my") {
      let el = document.createElement("div");
      el.setAttribute("class", "message my-message");
      el.innerHTML = `
                <div>
                    <div class="text">${message.text}</div>
                </div>
            `;
      messageContainer.appendChild(el);
    } else if (type == "other") {
      let el = document.createElement("div");
      el.setAttribute("class", "message other-message");
      if (message.last === true) {
        el.innerHTML = `
        <div>
            <div class="text">${message.text}</div>
        </div>
        `;
      } else {
        el.innerHTML = `
        <div>
            <div class="name">${message.username}</div>
            <div class="text">${message.text}</div>
        </div>
        `;
      }
      messageContainer.appendChild(el);
    } else if (type == "update") {
      let el = document.createElement("div");
      el.setAttribute("class", "update");
      el.innerText = message;
      messageContainer.appendChild(el);
    }
    messageContainer.scrollTop =
      messageContainer.scrollHeight - messageContainer.clientHeight;
  }
  // function requestAndShowPermission() {
  //   Notification.requestPermission();
  // }
  // function showNotification(message) {
  //   if (Notification.permission === "granted") {
  //     let icon = "https://www.hellhades.tk/assets/icon.png";
  //     let title = message.username;
  //     let body = message.text;
  //     let notification = new Notification(title, { body, icon });
  //     notification.onclick = () => {
  //       notification.close();
  //       window.parent.focus();
  //     };
  //   } else if (Notification.permission === "default") {
  //     requestAndShowPermission();
  //   } else {
  //     alert(message.text);
  //   }
  // }

  var canvasWidth = 880;
  var canvasHeight = 700;
  var canvas = $("#paint");
  canvas.attr({
    width: canvasWidth,
    height: canvasHeight,
    // width: 380*$("#paint-container")[0].offsetHeight/435,
    // height: 800*$("#paint-container")[0].offsetHeight/810,
  });
  var colors = document.getElementsByClassName("colors");
  var trazos = document.getElementsByClassName("trazos");
  var bgImgs = document.getElementsByClassName("pre-bg");
  var showColor = document.querySelector(".show-color");
  var ctx = canvas[0].getContext("2d");

  var current = {
    color: "#000000",
    opacity: "ff",
    linewidth: 1,
    typetrazo: "round",
  };
  let eraserColor;
  var goDraw = true;
  var drawing = false;
  var trazosActive = false;
  var eyedropperIsActive = false;
  canvas[0].addEventListener("mousedown", onMouseDown, false);
  canvas[0].addEventListener("mouseup", onMouseUp, false);
  canvas[0].addEventListener("mouseout", onMouseUp, false);
  canvas[0].addEventListener("mousemove", throttle(onMouseMove, 10), false);

  //Touch support for mobile devices
  canvas[0].addEventListener("touchstart", onMouseDown, false);
  canvas[0].addEventListener("touchend", onMouseUp, false);
  canvas[0].addEventListener("touchcancel", onMouseUp, false);
  canvas[0].addEventListener("touchmove", throttle(onMouseMove, 10), false);

  for (var i = 0; i < trazos.length; i++) {
    trazos[i].addEventListener("click", onTrazoUpdate, false);
  }
  for (var i = 0; i < bgImgs.length; i++) {
    bgImgs[i].addEventListener("click", onImageBGUpdate, false);
  }

  socket.on("drawing", onDrawingEvent);
  socket.on("clean", onCleanEvent);

  function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255) throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
  }

  function drawLine(
    x0,
    y0,
    x1,
    y1,
    color,
    opacity,
    lineWidth,
    typeTrazo,
    img,
    emit
  ) {
    console.log(x0, y0, x1, y1, color, opacity, lineWidth, typeTrazo, emit);
    ctx.beginPath();
    if (eyedropperIsActive == true) {
      var pxData = ctx.getImageData(x0, y0, 1, 1);
      var hex =
        "#" +
        (
          "000000" + rgbToHex(pxData.data[0], pxData.data[1], pxData.data[2])
        ).slice(-6);
      colorUpdate(hex);
      return;
    }
    const TYPE_TRAZOS = {
      spray: () => {
        ctx.beginPath();
        ctx.fillStyle = `${color}${opacity}`;
        for (var i = 10; i--; ) {
          ctx.rect(
            x0 + Math.random() * lineWidth - 10,
            y1 + Math.random() * lineWidth - 10,
            1,
            1
          );
          ctx.fill();
        }
        ctx.closePath();
        if (!emit) {
          return;
        }
        var w = canvas.width();
        var h = canvas.height();

        socket.emit("drawing", {
          x0: x0 / w,
          y0: y0 / h,
          x1: x1 / w,
          y1: y1 / h,
          color: color,
          opacity: opacity,
          lW: lineWidth,
          tT: typeTrazo,
          img: null,
        });
      },
      fill: () => {
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width(), canvas.height());
        ctx.fillStyle = `${color}${opacity}`;
        ctx.fill();
        ctx.closePath();
        if (!emit) {
          return;
        }
        var w = canvas.width();
        var h = canvas.height();

        socket.emit("drawing", {
          x0: w,
          y0: h,
          x1: w,
          y1: h,
          color: color,
          opacity: opacity,
          lW: lineWidth,
          tT: typeTrazo,
          img: null,
        });
      },
      img: () => {
        let bgImg = new Image();
        bgImg.src = "/assets/" + img + ".jpg";
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
        };
        if (!emit) {
          return;
        }
        var w = canvas.width();
        var h = canvas.height();

        socket.emit("drawing", {
          x0: w,
          y0: h,
          x1: w,
          y1: h,
          color: color,
          opacity: opacity,
          lW: lineWidth,
          tT: typeTrazo,
          img: img,
        });
      },
    };
    const TYPE_TRAZOS_DEFAULT = () => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = `${color}${opacity}`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = typeTrazo;
      ctx.stroke();
      ctx.closePath();

      if (!emit) {
        return;
      }
      var w = canvas.width();
      var h = canvas.height();

      socket.emit("drawing", {
        x0: x0 / w,
        y0: y0 / h,
        x1: x1 / w,
        y1: y1 / h,
        color: color,
        opacity: opacity,
        lW: lineWidth,
        tT: typeTrazo,
        img: null,
      });
    };
    TYPE_TRAZOS[typeTrazo] ? TYPE_TRAZOS[typeTrazo]() : TYPE_TRAZOS_DEFAULT();
    // switch (typeTrazo) {
    //   case "spray":
    //     ctx.beginPath();
    //     ctx.fillStyle = `${color}${opacity}`;
    //     for (var i = 10; i--; ) {
    //       ctx.rect(
    //         x0 + Math.random() * lineWidth - 10,
    //         y1 + Math.random() * lineWidth - 10,
    //         1,
    //         1
    //       );
    //       ctx.fill();
    //     }
    //     ctx.closePath();
    //     if (!emit) {
    //       return;
    //     }
    //     var w = canvas.width();
    //     var h = canvas.height();

    //     socket.emit("drawing", {
    //       x0: x0 / w,
    //       y0: y0 / h,
    //       x1: x1 / w,
    //       y1: y1 / h,
    //       color: color,
    //       opacity: opacity,
    //       lW: lineWidth,
    //       tT: typeTrazo,
    //     });
    //     break;
    //   case "fill":
    //     ctx.beginPath();
    //     ctx.rect(0, 0, canvas.width(), canvas.height());
    //     ctx.fillStyle = `${color}${opacity}`;
    //     ctx.fill();
    //     ctx.closePath();
    //     if (!emit) {
    //       return;
    //     }
    //     var w = canvas.width();
    //     var h = canvas.height();

    //     socket.emit("drawing", {
    //       x0: w,
    //       y0: h,
    //       x1: w,
    //       y1: h,
    //       color: color,
    //       opacity: opacity,
    //       lW: lineWidth,
    //       tT: typeTrazo,
    //     });
    //     break;
    //   default:
    //     ctx.beginPath();
    //     ctx.moveTo(x0, y0);
    //     ctx.lineTo(x1, y1);
    //     ctx.strokeStyle = `${color}${opacity}`;
    //     ctx.lineWidth = lineWidth;
    //     ctx.lineCap = typeTrazo;
    //     ctx.stroke();
    //     ctx.closePath();

    //     if (!emit) {
    //       return;
    //     }
    //     var w = canvas.width();
    //     var h = canvas.height();

    //     socket.emit("drawing", {
    //       x0: x0 / w,
    //       y0: y0 / h,
    //       x1: x1 / w,
    //       y1: y1 / h,
    //       color: color,
    //       opacity: opacity,
    //       lW: lineWidth,
    //       tT: typeTrazo,
    //     });
    //     break;
    // }
  }

  function onMouseDown(e) {
    if (!goDraw) {
      return;
    }
    drawing = true;
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  }

  function onMouseUp(e) {
    if (!drawing) {
      return;
    }
    drawing = false;
    drawLine(
      current.x,
      current.y,
      e.clientX || e.touches[0].clientX,
      e.clientY || e.touches[0].clientY,
      current.color,
      current.opacity,
      current.linewidth,
      current.typetrazo,
      null,
      true
    );
  }

  function onMouseMove(e) {
    if (!drawing) {
      return;
    }
    drawLine(
      current.x,
      current.y,
      e.clientX || e.touches[0].clientX,
      e.clientY || e.touches[0].clientY,
      current.color,
      current.opacity,
      current.linewidth,
      current.typetrazo,
      null,
      true
    );
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  }
  function colorUpdate(color) {
    current.color = color;
    showColor.style.backgroundColor = color;
  }
  function onImageBGUpdate(e) {
    e.target.className.split(" ")[1];
    switch (e.target.className.split(" ")[1]) {
      case "lake":
        drawLine(
          0,
          0,
          0,
          0,
          current.color,
          current.opacity,
          current.linewidth,
          "img",
          "lake",
          true
        );
        break;
      case "house":
        drawLine(
          0,
          0,
          0,
          0,
          current.color,
          current.opacity,
          current.linewidth,
          "img",
          "house",
          true
        );
        break;
      case "mountain":
        drawLine(
          0,
          0,
          0,
          0,
          current.color,
          current.opacity,
          current.linewidth,
          "img",
          "mountain",
          true
        );
        break;
    }
  }
  function onTrazoUpdate(e) {
    if (e.target.classList.contains("active")) {
      e.target.classList.remove("active");
    } else {
      for (var i = 0; i < trazos.length; i++) {
        trazos[i].classList.remove("active");
      }
      e.target.classList.add("active");
    }
    switch (e.target.className.split(" ")[1]) {
      case "eraser":
        current.typetrazo = "round";
        current.color = eraserColor;
        break;
      case "fill":
        eraserColor = current.color;
        var w = canvas.width();
        var h = canvas.height();
        drawLine(
          w,
          h,
          w,
          h,
          current.color,
          current.opacity,
          current.linewidth,
          "fill",
          null,
          true
        );
        break;
      case "eyedropper":
        if (eyedropperIsActive == true) {
          eyedropperIsActive = false;
        } else {
          eyedropperIsActive = true;
        }
        break;
      default:
        current.typetrazo = e.target.className.split(" ")[1];
        break;
    }
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function () {
      var time = new Date().getTime();

      if (time - previousCall >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data) {
    var w = canvas.width();
    var h = canvas.height();
    drawLine(
      data.x0 * w,
      data.y0 * h,
      data.x1 * w,
      data.y1 * h,
      data.color,
      data.opacity,
      data.lW,
      data.tT,
      data.img
    );
  }

  function onCleanEvent() {
    ctx.clearRect(0, 0, canvas.width(), canvas.height());
  }
  $("#brush-size").on("input", function () {
    current.linewidth = this.value;
  });
  $("#brush-opacity").on("input", function () {
    current.opacity = Math.abs(this.value).toString(16);
  });
  $("#color-picker").on("input", function () {
    current.color = this.value;
    showColor.style.backgroundColor = this.value;
  });
  $("#clear-btn").click(function () {
    ctx.clearRect(0, 0, canvas.width(), canvas.height());
    socket.emit("clean");
  });
  $("#undo-btn").click(function () {
    app.querySelector("#game").classList.toggle("active");
  });

  $("#zoomIn").click(function () {
    goDraw = false;
  });
  $("#zoomOut").click(function () {
    goDraw = true;
  });

  // Juego
  var ASSET_URL = "assets/world/";

  var game = new Phaser.Game(
    canvasWidth,
    canvasHeight,
    Phaser.AUTO,
    "game",
    {
      preload: preload,
      create: create,
      update: GameLoop,
    },
    true
  );

  var WORLD_SIZE = { w: canvasWidth, h: canvasHeight };

  var water_tiles = [];
  var bullet_array = [];
  var other_players = {};

  var player = {
    sprite: null, //Will hold the sprite when it's created
    speed_x: 0, // This is the speed it's currently moving at
    speed_y: 0,
    speed: 2, // This is the parameter for how fast it should move
    friction: 0.2,
    shot: false,
    frames: 10,
    update: function () {
      if (
        game.input.keyboard.isDown(Phaser.Keyboard.D) ||
        game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)
      ) {
        this.speed_x += 1 * this.speed;
        this.sprite.animations.play("walkRight", this.frames, true);
      } else if (
        game.input.keyboard.isDown(Phaser.Keyboard.A) ||
        game.input.keyboard.isDown(Phaser.Keyboard.LEFT)
      ) {
        this.speed_x -= 1 * this.speed;
        this.sprite.animations.play("walkLeft", this.frames, true);
      }

      if (
        game.input.keyboard.isDown(Phaser.Keyboard.W) ||
        game.input.keyboard.isDown(Phaser.Keyboard.UP)
      ) {
        this.speed_y -= 1 * this.speed;
        this.sprite.animations.play("walkBackward", this.frames, true);
      } else if (
        game.input.keyboard.isDown(Phaser.Keyboard.S) ||
        game.input.keyboard.isDown(Phaser.Keyboard.DOWN)
      ) {
        this.speed_y += 1 * this.speed;
        this.sprite.animations.play("walkForward", this.frames, true);
      }
      this.sprite.x += this.speed_x;
      this.sprite.y += this.speed_y;

      this.speed_x *= this.friction;
      this.speed_y *= this.friction;
      // Shoot bullet
      if (game.input.activePointer.leftButton.isDown && !this.shot) {
        var speed_x = Math.cos(this.sprite.rotation + Math.PI / 2) * 20;
        var speed_y = Math.sin(this.sprite.rotation + Math.PI / 2) * 20;
        this.shot = true;
        // Tell the server we shot a bullet
        socket.emit("shoot-bullet", {
          x: this.sprite.x,
          y: this.sprite.y,
          speed_x: speed_x,
          speed_y: speed_y,
        });
      }
      if (!game.input.activePointer.leftButton.isDown) this.shot = false;

      // To make player flash when they are hit, set player.spite.alpha = 0
      if (this.sprite.alpha < 1) {
        this.sprite.alpha += (1 - this.sprite.alpha) * 0.16;
      } else {
        this.sprite.alpha = 1;
      }
      // Tell the server we've moved
      socket.emit("move-player", {
        x: this.sprite.x,
        y: this.sprite.y,
        animation: this.sprite.animations.currentAnim.name,
      });
    },
  };

  function CreateShip(x, y) {
    // type is an int that can be between 1 and 6 inclusive
    // returns the sprite just created
    var sprite = game.add.sprite(x, y, "character");
    sprite.frame = 16;
    sprite.anchor.setTo(0.2, 0.2);
    return sprite;
  }

  function preload() {
    game.load.crossOrigin = "Anonymous";
    game.load.spritesheet(
      "character",
      "assets/character/character_sprite.png",
      32,
      32,
      48
    );

    game.load.image("bullet", ASSET_URL + "cannon_ball.png");
  }

  function create() {
    game.stage.disableVisibilityChange = true;
    player.sprite = game.add.sprite(
      canvasWidth / 2,
      canvasHeight / 2 - (Math.random() * WORLD_SIZE.h) / 2,
      "character"
    );
    player.sprite.frame = 16;
    player.sprite.animations.add(
      "walkBackward",
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      10,
      true
    );
    player.sprite.animations.add(
      "walkForward",
      [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
      10,
      true
    );
    player.sprite.animations.add(
      "walkLeft",
      [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
      10,
      true
    );
    player.sprite.animations.add(
      "walkRight",
      [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
      10,
      true
    );
    player.sprite.anchor.setTo(0.2, 0.2);

    game.world.setBounds(0, 0, WORLD_SIZE.w, WORLD_SIZE.h);

    game.camera.x = player.sprite.x - canvasWidth / 2;
    game.camera.y = player.sprite.y - canvasHeight / 2;

    socket.emit("new-player", {
      x: player.sprite.x,
      y: player.sprite.y,
      animation: player.sprite.animations.currentAnim.name,
    });
    // Listen for other players connecting
    socket.on("update-players", function (players_data) {
      var players_found = {};
      // Loop over all the player data received
      for (var id in players_data) {
        // If the player hasn't been created yet
        if (other_players[id] == undefined && id != socket.id) {
          // Make sure you don't create yourself
          var data = players_data[id];
          var p = CreateShip(data.x, data.y, data.animation);
          other_players[id] = p;
          console.log(
            "Created new player at (" +
              data.x +
              ", " +
              data.y +
              ")" +
              data.animation
          );
        }
        players_found[id] = true;

        // Update positions of other players
        if (id != socket.id) {
          other_players[id].target_x = players_data[id].x; // Update target, not actual position, so we can interpolate
          other_players[id].target_y = players_data[id].y;
          other_players[id].target_animation = players_data[id].animation;
        }
      }
      // Check if a player is missing and delete them
      for (var id in other_players) {
        if (!players_found[id]) {
          other_players[id].destroy();
          delete other_players[id];
        }
      }
    });

    // Listen for bullet update events
    socket.on("bullets-update", function (server_bullet_array) {
      // If there's not enough bullets on the client, create them
      for (var i = 0; i < server_bullet_array.length; i++) {
        if (bullet_array[i] == undefined) {
          bullet_array[i] = game.add.sprite(
            server_bullet_array[i].x,
            server_bullet_array[i].y,
            "bullet"
          );
        } else {
          //Otherwise, just update it!
          bullet_array[i].x = server_bullet_array[i].x;
          bullet_array[i].y = server_bullet_array[i].y;
        }
      }
      // Otherwise if there's too many, delete the extra
      for (var i = server_bullet_array.length; i < bullet_array.length; i++) {
        bullet_array[i].destroy();
        bullet_array.splice(i, 1);
        i--;
      }
    });

    // Listen for any player hit events and make that player flash
    socket.on("player-hit", function (id) {
      if (id == socket.id) {
        //If this is you
        player.sprite.alpha = 0;
      } else {
        // Find the right player
        other_players[id].alpha = 0;
      }
    });
  }

  function GameLoop() {
    player.update();
    // Move camera with player
    var camera_x = player.sprite.x - canvasWidth / 2;
    var camera_y = player.sprite.y - canvasHeight / 2;
    game.camera.x += (camera_x - game.camera.x) * 0.08;
    game.camera.y += (camera_y - game.camera.y) * 0.08;

    // Each player is responsible for bringing their alpha back up on their own client
    // Make sure other players flash back to alpha = 1 when they're hit
    for (var id in other_players) {
      if (other_players[id].alpha < 1) {
        other_players[id].alpha += (1 - other_players[id].alpha) * 0.16;
      } else {
        other_players[id].alpha = 1;
      }
    }

    // Interpolate all players to where they should be
    for (var id in other_players) {
      var p = other_players[id];
      if (p.target_x != undefined) {
        p.x += (p.target_x - p.x) * 1;
        p.y += (p.target_y - p.y) * 1;
      }
    }
  }
})();