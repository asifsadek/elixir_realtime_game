"use strict";
import {
  Socket, Channel
} from "phoenix"

import {Constants} from "./constants";
import {Camera} from "./camera";
import { GameState, PlayerState } from "./state";
import { Level, Collidable, PlayerBlock } from "./entities";
import { PlayerData, Game } from "./game";

class App {
  static socket: Socket;
  static roomChan: Channel;
  static game: Game;

  public static start() {
    this.socket = new Socket("/socket", {})
    this.socket.connect();
    this.roomChan = this.socket.channel("rooms:lobby", {})
    this.roomChan.join().receive("ignore", () => console.log("auth error"))
      .receive("ok", () => { console.log("join ok") })
    this.roomChan.onError(e => console.log("something went wrong", e))

    this.roomChan.on("init_data", (data : { blocks: Array<PlayerData>, id: number, team: number }) => {
      this.run(data.id, data.team);

      for (const block of data.blocks) {
        this.game.state.level.collidables.push(new PlayerBlock(block.x, block.y, block.id, block.team));
      }
    });
  }

  public static run(id: number, team: number) {
    // chan.onClose(e => console.log("channel closed", e))

    this.game = new Game(id, team);
    this.game.state.roomChan = this.roomChan;
    const game = this.game;
    const c = game.canvas;
    const sheet = Game.spriteSheet;
    const gs = game.state;

    // Start the game loop
    game.run();

    this.roomChan.on("update_player", (msg: PlayerData) => {
      if (msg.id === this.game.state.user_id) {
        return;
      }
      const changedPlayer = this.game.state.playerStates.filter(x => x.id === msg.id);
      if (changedPlayer.length === 1) {
        changedPlayer[0].x = msg.x;
        changedPlayer[0].y = msg.y;
      } else if (changedPlayer.length === 0) {
        this.game.state.playerStates.push(new PlayerState(msg.x, msg.y, msg.id, msg.team));
      }
    });

    this.roomChan.on("remove_player", (res) => {
      const data = res.data;
      const new_id = res.new_id;
      const player_idx = this.game.state.playerStates.findIndex((x) => x.id === data.id);
      console.log(data.id, this.game.state.user_id);
      if (data.id !== this.game.state.user_id) {
        this.game.state.playerStates.splice(player_idx, 1);
      } else {
        const new_id = Math.floor(Math.random() * 10000);
        this.game.state.userState.id = new_id;
        this.game.state.user_id = new_id;
      }
    });

    this.roomChan.on("add_block", (data: PlayerData) => {
      this.game.state.level.collidables.push(new PlayerBlock(data.x, data.y, data.id, data.team));
    });

    this.roomChan.on("remove_blocks", (data: {block_ids: Array<number>}) => {
      for (let block of this.game.state.level.collidables) {
        if (block instanceof PlayerBlock && data.block_ids.indexOf(block.id) !== -1) {
          block.team = (block.team === 1) ? 0 : 1;
        }
      }
    });

    this.roomChan.on("overview_data", (data : { flag_holder: Array<number | null>, score: Array<number> }) => {
      for (let i = 0; i < Constants.TEAMS; i++) {
        this.game.state.flags[i].holding_id = data.flag_holder[i];
      }
      this.game.state.scores = data.score;
    });
  }

}

App.start();

export default App