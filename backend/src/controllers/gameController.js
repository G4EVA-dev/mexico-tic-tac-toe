const { v4: uuidv4 } = require("uuid");
const Game = require("../models/gameModel");

class GameController {
  constructor(io) {
    this.io = io;
  }

  async createGame(req, res) {
    try {
      const { player1 } = req.body;
      const gameId = uuidv4();

      // For AI games, set status to "in-progress" immediately
      const initialStatus = "waiting";

      const newGame = await Game.createGame({
        gameId,
        player1,
        player2: "AI", // Default to AI for single-player games
        board: JSON.stringify(Array(9).fill("")),
        currentTurn: player1,
        status: initialStatus,
      });

      // If it's an AI game, update the status to "in-progress" immediately after creation
      if (newGame.player2 === "AI") {
        newGame.status = "in-progress";
        await newGame.updateGame(
          newGame.board,
          newGame.currentTurn,
          "in-progress"
        );
      }

      res.status(201).json(newGame);
      this.io.emit("gameCreated", { gameId, player1 });
    } catch (error) {
      console.error("Failed to create game:", error);
      res.status(500).json({ error: "Failed to create game" });
    }
  }

  async joinGame(req, res) {
    try {
      const { gameId, player } = req.body;

      // Fetch the game from the database
      const game = await Game.getGameById(gameId);

      // Check if the game exists
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      // Check if the game is already full
      if (game.player2 !== "AI" && game.player2) {
        return res.status(400).json({ error: "Game is already full" });
      }

      // Add the second player and update the game status
      game.player2 = player;
      game.status = "in-progress";
      await game.updateGame(game.board, game.currentTurn, game.status);

      // Respond with the updated game state
      res.status(200).json(game);

      // Notify all clients that a player has joined the game
      this.io.emit("playerJoined", { gameId, player });
    } catch (error) {
      console.error("Failed to join game:", error);
      res.status(500).json({ error: "Failed to join game" });
    }
  }

  async getGameState(req, res) {
    try {
      const { gameId } = req.params;

      // Fetch the game from the database
      const game = await Game.getGameById(gameId);

      // Check if the game exists
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      // Respond with the current game state
      res.status(200).json(game);
    } catch (error) {
      console.error("Failed to get game state:", error);
      res.status(500).json({ error: "Failed to get game state" });
    }
  }

  async makeMove(req, res) {
    try {
      const { gameId, player, position } = req.body;

      // Validate inputs
      if (position === undefined || position < 0 || position > 8) {
        return res.status(400).json({ error: "Invalid position" });
      }

      // Fetch the game from the database
      const game = await Game.getGameById(gameId);

      // Check if the game exists
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      // For AI games, set status to "in-progress" if it's still "waiting"
      if (game.status === "waiting" && game.player2 === "AI") {
        game.status = "in-progress";
        await game.updateGame(game.board, game.currentTurn, "in-progress");
      }

      // Check if the game is in progress
      if (game.status !== "in-progress") {
        return res
          .status(400)
          .json({
            error: `Game is not in progress. Current status: ${game.status}`,
          });
      }

      // Check if it's the player's turn
      if (game.currentTurn !== player) {
        return res.status(400).json({ error: "Not your turn" });
      }

      // Parse the board
      const board = JSON.parse(game.board);

      // Check if the position is already taken
      if (board[position] !== "") {
        return res.status(400).json({ error: "Position already taken" });
      }

      // Update the board and switch turns
      board[position] = player === game.player1 ? "X" : "O";
      game.currentTurn = player === game.player1 ? game.player2 : game.player1;

      // Check for a winner or draw
      const winner = this.checkWinner(board);
      let gameWinner = null;

      if (winner) {
        game.status = "finished";
        gameWinner = winner === "X" ? game.player1 : game.player2;
      } else if (!board.includes("")) {
        game.status = "finished";
        gameWinner = "draw";
      }

      // Update the game in the database before AI move
      await game.updateGame(
        JSON.stringify(board),
        game.currentTurn,
        game.status,
        gameWinner
      );

      // If the game is against AI and it's AI's turn, make an AI move
      if (
        game.player2 === "AI" &&
        game.currentTurn === "AI" &&
        game.status === "in-progress"
      ) {
        const aiMove = this.getAIMove(board);
        board[aiMove] = "O"; // AI always plays "O"
        game.currentTurn = game.player1;

        // Check for a winner or draw after AI's move
        const aiWinner = this.checkWinner(board);
        if (aiWinner) {
          game.status = "finished";
          gameWinner = aiWinner === "X" ? game.player1 : game.player2;
        } else if (!board.includes("")) {
          game.status = "finished";
          gameWinner = "draw";
        }

        // Update the game in the database after AI move
        await game.updateGame(
          JSON.stringify(board),
          game.currentTurn,
          game.status,
          gameWinner
        );
      }

      // Respond with the updated game state
      res.status(200).json(game);

      // Notify all clients about the move
      this.io.emit("moveMade", { gameId, player, position, game });
    } catch (error) {
      console.error("Failed to make move:", error);
      res.status(500).json({ error: "Failed to make move" });
    }
  }

  getAIMove(board) {
    // Check if AI can win in one move
    const aiMove = this.findWinningMove(board, "O");
    if (aiMove !== -1) return aiMove;

    // Block player's winning move
    const blockMove = this.findWinningMove(board, "X");
    if (blockMove !== -1) return blockMove;

    // Try to take center
    if (board[4] === "") return 4;

    // Try to take corners
    const corners = [0, 2, 6, 8];
    for (const corner of corners) {
      if (board[corner] === "") return corner;
    }

    // Take any available position
    for (let i = 0; i < board.length; i++) {
      if (board[i] === "") {
        return i;
      }
    }

    return -1; // No moves available
  }

  findWinningMove(board, symbol) {
    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ];

    for (const [a, b, c] of winningCombinations) {
      // Check if we can win by placing at position a
      if (board[a] === "" && board[b] === symbol && board[c] === symbol)
        return a;
      // Check if we can win by placing at position b
      if (board[a] === symbol && board[b] === "" && board[c] === symbol)
        return b;
      // Check if we can win by placing at position c
      if (board[a] === symbol && board[b] === symbol && board[c] === "")
        return c;
    }

    return -1; // No winning move found
  }

  checkWinner(board) {
    const winningCombinations = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of winningCombinations) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }

    return null;
  }
}

module.exports = GameController;
