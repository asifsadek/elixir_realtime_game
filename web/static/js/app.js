import {
  Socket,
  LongPoller
} from "phoenix"

class App {

  static init() {
    let user_id = Math.floor(Math.random()*10000);
    let socket = new Socket("/socket", {
      params: {id: user_id}
    })

    socket.connect();

    var chan = socket.channel("rooms:lobby", {})
    console.log(chan);
    chan.join().receive("ignore", () => console.log("auth error"))
               .receive("ok", (x) => {console.log("join ok"); console.log(x)})
    chan.onError(e => console.log("something went wrong", e))
    chan.onClose(e => console.log("channel closed", e))

    var c = document.getElementById("gameCanvas");
    var ctx = c.getContext("2d");

    ctx.fillRect(0, 0, 32, 32);

    var Key = {
      _pressed: {},

      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40,

      isDown: function (keyCode) {
        return this._pressed[keyCode];
      },

      onKeydown: function (event) {
        this._pressed[event.keyCode] = true;
      },

      onKeyup: function (event) {
        delete this._pressed[event.keyCode];
      }
    };

    window.addEventListener('keyup', function (event) {
      Key.onKeyup(event);
    }, false);
    window.addEventListener('keydown', function (event) {
      Key.onKeydown(event);
    }, false);

    var x = 0,
      y = 0,
      xx = 0,
      yy = 0;
    var fps = 50;

    function run() {
      update();
      draw();
      push();
    };

    // Start the game loop
    setInterval(run, 1000 / fps);

    var v = 5;

    function update() {
      if (Key.isDown(Key.UP)) {
        y -= v;
      }
      if (Key.isDown(Key.DOWN)) {
        y += v;
      }
      if (Key.isDown(Key.LEFT)) {
        x -= v;
      }
      if (Key.isDown(Key.RIGHT)) {
        x += v;
      }
    }

    function draw() {
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(x, y, 32, 32);
      ctx.fillRect(xx, yy, 32, 32);
    }

    function push() {
      chan.push("new:msg", {
        user: '1',
        x: x,
        y: y,
        user_id: user_id
      })
    }

    chan.on("new:msg", msg => {
      if (msg.user_id !== user_id) {
        xx = msg.x;
        yy = msg.y;
      }
    })
  }

}

$(() => App.init())

export default App