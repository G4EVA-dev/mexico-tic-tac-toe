const { query } = require("../db/index");

class Game {
  constructor(
    id,
    gameId,
    player1,
    player2,
    board,
    currentTurn,
    status,
    winner
  ) {
    this.id = id;
    this.gameId = gameId;
    this.player1 = player1;
    this.player2 = player2;
    this.board = board;
    this.currentTurn = currentTurn;
    this.status = status;
    this.winner = winner;
  }

  static async createGame({
    gameId,
    player1,
    player2,
    board,
    currentTurn,
    status,
  }) {
    const result = await query(
      "INSERT INTO games (game_id, player1, player2, board, current_turn, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [gameId, player1, player2, board, currentTurn, status]
    );

    const row = result.rows[0];
    return new Game(
      row.id,
      row.game_id,
      row.player1,
      row.player2,
      row.board,
      row.current_turn,
      row.status,
      row.winner
    );
  }

  static async getGameById(gameId) {
    const result = await query("SELECT * FROM games WHERE game_id = $1", [
      gameId,
    ]);
    if (result.rows.length) {
      const row = result.rows[0];
      return new Game(
        row.id,
        row.game_id,
        row.player1,
        row.player2,
        row.board,
        row.current_turn,
        row.status,
        row.winner
      );
    }
    return null;
  }

  async updateGame(board, currentTurn, status, winner = null) {
    const result = await query(
      "UPDATE games SET board = $1, current_turn = $2, status = $3, winner = $4 WHERE game_id = $5 RETURNING *",
      [board, currentTurn, status, winner, this.gameId]
    );
    const row = result.rows[0];
    Object.assign(this, {
      id: row.id,
      gameId: row.game_id,
      player1: row.player1,
      player2: row.player2,
      board: row.board,
      currentTurn: row.current_turn,
      status: row.status,
      winner: row.winner,
    });
  }
}

module.exports = Game;
