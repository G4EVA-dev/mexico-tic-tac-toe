const { v4: uuidv4 } = require("uuid"); // Import uuid for unique game IDs

class GameController {
  constructor(io) {
    this.io = io; // Store the Socket.IO instance
    this.games = {}; // In-memory storage for games
  }

  /**
   * Create a new game.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async createGame(req, res) {
    try {
      const { player1 } = req.body;
      const gameId = uuidv4(); // Generate a unique game ID

      // Initialize the game state
      this.games[gameId] = {
        gameId,
        player1,
        player2: null,
        board: Array(9).fill(""), // Empty 3x3 board
        currentTurn: player1,
        status: "waiting", // Game status: waiting, in-progress, finished
        winner: null,
      };

      // Respond with the game ID and player1
      res.status(201).json({ gameId, player1 });

      // Notify all clients that a new game has been created
      this.io.emit("gameCreated", { gameId, player1 });
    } catch (error) {
      console.error("Failed to create game:", error);
      res.status(500).json({ error: "Failed to create game" });
    }
  }

  /**
   * Join an existing game.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async joinGame(req, res) {
    try {
      const { gameId, player } = req.body;
      const game = this.games[gameId];

      // Check if the game exists
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      // Check if the game is already full
      if (game.player2) {
        return res.status(400).json({ error: "Game is already full" });
      }

      // Add the second player and update the game status
      game.player2 = player;
      game.status = "in-progress";

      // Respond with the updated game state
      res.status(200).json(game);

      // Notify all clients that a player has joined the game
      this.io.emit("playerJoined", { gameId, player });
    } catch (error) {
      console.error("Failed to join game:", error);
      res.status(500).json({ error: "Failed to join game" });
    }
  }

  /**
   * Get the current state of a game.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async getGameState(req, res) {
    try {
      const { gameId } = req.params;
      const game = this.games[gameId];

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

  /**
   * Make a move in the game.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  async makeMove(req, res) {
    try {
      const { gameId, player, position } = req.body;
      const game = this.games[gameId];

      // Check if the game exists
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      // Check if the game is in progress
      if (game.status !== "in-progress") {
        return res.status(400).json({ error: "Game is not in progress" });
      }

      // Check if the position is already taken
      if (game.board[position] !== "") {
        return res.status(400).json({ error: "Position already taken" });
      }

      // Check if it's the player's turn
      if (game.currentTurn !== player) {
        return res.status(400).json({ error: "Not your turn" });
      }

      // Update the board and switch turns
      game.board[position] = player === game.player1 ? "X" : "O";
      game.currentTurn = player === game.player1 ? game.player2 : game.player1;

      // Check for a winner or draw
      const winner = this.checkWinner(game.board);
      if (winner) {
        game.status = "finished";
        game.winner = winner;
      } else if (!game.board.includes("")) {
        game.status = "finished";
        game.winner = "draw";
      }

      // If the game is against AI and it's AI's turn, make an AI move
      if (
        game.player2 === "AI" &&
        game.currentTurn === "AI" &&
        game.status === "in-progress"
      ) {
        const aiMove = this.getAIMove(game.board);
        game.board[aiMove] = "O"; // AI always plays "O"
        game.currentTurn = game.player1;

        // Check for a winner or draw after AI's move
        const aiWinner = this.checkWinner(game.board);
        if (aiWinner) {
          game.status = "finished";
          game.winner = aiWinner;
        } else if (!game.board.includes("")) {
          game.status = "finished";
          game.winner = "draw";
        }
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

  /**
   * Determine the AI's move.
   * @param {Array} board - The current game board.
   * @returns {number} - The index of the AI's move.
   */
  getAIMove(board) {
    // Simple AI: Pick the first available position
    for (let i = 0; i < board.length; i++) {
      if (board[i] === "") {
        return i;
      }
    }
    return -1; // No moves available
  }

  /**
   * Check if there's a winner.
   * @param {Array} board - The current game board.
   * @returns {string|null} - The winner ("X" or "O") or null if no winner.
   */
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
