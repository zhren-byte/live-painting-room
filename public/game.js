var socket,
  canvas,
  ctx,
  brush = {
    x: 0,
    y: 0,
    color: "#ff0000",
    size: 10,
    down: false,
  },
  strokes = [],
  currentStroke = null;

function paint() {
  ctx.clearRect(0, 0, canvas.width(), canvas.height());
  ctx.lineCap = "round";
  for (var i = 0; i < strokes.length; i++) {
    var s = strokes[i];
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (var j = 0; j < s.points.length; j++) {
      var p = s.points[j];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}
function init() {
  canvas = $("#paint");
  canvas.attr({
    width:
      window.innerWidth -
      document.querySelector(".screen.chat-screen").clientWidth -
      4,
    height:
      window.innerHeight -
      document.querySelector("#game .top-nav").clientHeight -
      5,
  });
  ctx = canvas[0].getContext("2d");

  function mouseEvent(e) {
    brush.x = e.pageX;
    brush.y = e.pageY;

    currentStroke.points.push({
      x: brush.x,
      y: brush.y,
    });

    paint();
  }

  canvas
    .mousedown(function (e) {
      brush.down = true;

      currentStroke = {
        color: brush.color,
        size: brush.size,
        points: [],
      };

      strokes.push(currentStroke);

      mouseEvent(e);
    })
    .mouseup(function (e) {
      brush.down = false;

      mouseEvent(e);

      currentStroke = null;
    })
    .mousemove(function (e) {
      if (brush.down) mouseEvent(e);
    });

  $("#undo-btn").click(function () {
    strokes.pop();
    paint();
  });

  $("#clear-btn").click(function () {
    strokes = [];
    paint();
  });

  $("#color-picker").on("input", function () {
    brush.color = this.value;
  });

  $("#brush-size").on("input", function () {
    brush.size = this.value;
  });
}

$(init);
function mouseEvent(e) {
  brush.x = e.pageX;
  brush.y = e.pageY;

  currentStroke.points.push({
    x: brush.x,
    y: brush.y,
  });

  data = {
    x: brush.x,
    y: brush.y,
  };

  socket.emit("mouse", data);

  paint();
}
socket.on("painter", (data) => {
  currentStroke = {
    color: brush.color,
    size: brush.size,
    points: [],
  };

  strokes.push(currentStroke);

  currentStroke.points.push({
    x: data.x,
    y: data.y,
  });

  paint();
});
