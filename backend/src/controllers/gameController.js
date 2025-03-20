const { v4: uuidv4 } = require("uuid");
const Game = require("../models/gameModel");

class GameController {
  constructor(io) {
    this.io = io;

    // Set up socket handlers
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log("New client connected");

      socket.on("joinGame", ({ gameId, player }) => {
        console.log(`Player ${player} joining game ${gameId}`);
        socket.join(gameId);
      });

      socket.on("gameJoined", async ({ gameId, player }) => {
        console.log(`Game ${gameId} joined by ${player}`);

        // Fetch the latest game state
        const game = await Game.getGameById(gameId);
        if (game) {
          // Broadcast the updated game state to all clients in the game room
          this.io.to(gameId).emit("gameUpdated", {
            gameId,
            game,
          });
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });
  }

  async createGame(req, res) {
    try {
      const { player1, isAIGame = false } = req.body;
      const gameId = uuidv4();

      // Set initial status to waiting
      const initialStatus = "waiting";

      const newGame = await Game.createGame({
        gameId,
        player1,
        player2: isAIGame ? "AI" : null, // Set player2 to null for multiplayer games
        board: JSON.stringify(Array(9).fill("")),
        currentTurn: player1,
        status: initialStatus,
      });

      // If it's an AI game, update the status to "in-progress" immediately
      if (isAIGame) {
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
      if (game.player2 && game.player2 !== "AI" && game.player2 !== null) {
        return res.status(400).json({ error: "Game is already full" });
      }

      // Add the second player and update the game status
      game.player2 = player;
      game.status = "in-progress";
      await game.updateGame(game.board, game.currentTurn, game.status);

      // Fetch the updated game
      const updatedGame = await Game.getGameById(gameId);

      // Respond with the updated game state
      res.status(200).json(updatedGame);

      // Notify all clients that a player has joined the game and broadcast the updated game state
      this.io.to(gameId).emit("playerJoined", { gameId, player });
      this.io.to(gameId).emit("gameUpdated", { gameId, game: updatedGame });
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

      // Check if the game is in progress
      if (game.status !== "in-progress") {
        return res.status(400).json({
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

      // Update the game in the database
      await game.updateGame(
        JSON.stringify(board),
        game.currentTurn,
        game.status,
        gameWinner
      );

      // Fetch the updated game
      const updatedGame = await Game.getGameById(gameId);

      // Respond with the updated game state
      res.status(200).json(updatedGame);

      // Notify all clients about the move
      this.io.to(gameId).emit("moveMade", {
        gameId,
        player,
        position,
        game: updatedGame,
      });

      // Only make AI move if player2 is explicitly "AI" and it's AI's turn and game is in progress
      if (
        game.player2 === "AI" &&
        game.currentTurn === "AI" &&
        game.status === "in-progress"
      ) {
        // Add a small delay to make the AI move feel more natural
        setTimeout(async () => {
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

          // Fetch the updated game
          const updatedAIGame = await Game.getGameById(gameId);

          // Notify all clients about the AI move
          this.io.to(gameId).emit("moveMade", {
            gameId,
            player: "AI",
            position: aiMove,
            game: updatedAIGame,
          });
        }, 500);
      }
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
