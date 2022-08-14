(function () {
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
      app.querySelector("#game").classList.add("active");
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
                    <div class="name">Tú</div>
                    <div class="text">${message.text}</div>
                </div>
            `;
      messageContainer.appendChild(el);
    } else if (type == "other") {
      let el = document.createElement("div");
      el.setAttribute("class", "message other-message");
      el.innerHTML = `
                <div>
                    <div class="name">${message.username}</div>
                    <div class="text">${message.text}</div>
                </div>
            `;
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

  var canvas = $("#paint");
  canvas.attr({
    width: 380,
    height: 435,
    // width: 380*$("#paint-container")[0].offsetHeight/435,
    // height: 800*$("#paint-container")[0].offsetHeight/810,
  });
  var colors = document.getElementsByClassName("colors");
  var trazos = document.getElementsByClassName("trazos");
  var showColor = document.querySelector(".show-color");
  var ctx = canvas[0].getContext("2d");

  var current = {
    color: "#000000",
    opacity: "ff",
    linewidth: 1,
    typetrazo: "round",
  };
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

  for (var i = 0; i < colors.length; i++) {
    colors[i].addEventListener("click", onColorUpdate, false);
  }
  for (var i = 0; i < trazos.length; i++) {
    trazos[i].addEventListener("click", onTrazoUpdate, false);
  }

  socket.on("drawing", onDrawingEvent);
  socket.on("clean", onCleanEvent);
  
  function drawLine(
    x0,
    y0,
    x1,
    y1,
    color,
    opacity,
    lineWidth,
    typeTrazo,
    emit
  ) {
    console.log(x0, y0, x1, y1, color,opacity, lineWidth, typeTrazo, emit);
    ctx.beginPath();
    if (eyedropperIsActive == true) {
      var pxData = ctx.getImageData(x0, y0, 1, 1);
      eyedropperIsActive = false;
      colorUpdate(
        "rgb(" +
          pxData.data[0] +
          "," +
          pxData.data[1] +
          "," +
          pxData.data[2] +
          ")"
      );
      return;
    }
    switch (typeTrazo) {
      case "spray":
        ctx.beginPath();
        ctx.fillStyle = color;
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
        });
        break;
      case "fill":
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
        });
        break;
      default:
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
        });
        break;
    }
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
      true
    );
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  }
  function colorUpdate(color) {
    current.color = color;
    showColor.style.backgroundColor = color;
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
        current.color = "#ffffff";
        break;
      case "fill":
        var w = canvas.width();
        var h = canvas.height();
        drawLine(w, h, w, h, current.color, current.opacity, current.linewidth, "fill", true);
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
      data.tT
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

  $("#zoomIn").click(function () {
    goDraw = false;
  });
  $("#zoomOut").click(function () {
    goDraw = true;
  });
})();
