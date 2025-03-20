import React, { useState, useEffect } from "react";
import axios from "axios";
import Board from "./components/Board";
import "./styles/App.css";
import { io } from "socket.io-client";

const backendUrl = "https://mexico-tic-tac-toe.onrender.com";
console.log(`This is the ${backendUrl}`);

const socket = io(backendUrl, {
  withCredentials: true,
});

const App = () => {
  const [gameId, setGameId] = useState("");
  const [player, setPlayer] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState] = useState({
    board: Array(9).fill(""),
    currentTurn: "",
    status: "waiting",
  });
  const [isSpectator, setIsSpectator] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState("");
  const [gameIdToJoin, setGameIdToJoin] = useState(""); // New state for game ID input

  useEffect(() => {
    // Setup socket listeners
    socket.on(
      "playerJoined",
      ({ gameId: joinedGameId, player: joinedPlayer }) => {
        console.log(`${joinedPlayer} joined game ${joinedGameId}`);
        if (joinedGameId === gameId) {
          setNotification(`${joinedPlayer} has joined the game!`);
          // Refresh game state when a player joins
          fetchGameState(gameId);
          // Clear notification after 3 seconds
          setTimeout(() => setNotification(""), 3000);
        }
      }
    );

    socket.on("moveMade", ({ gameId: moveGameId, game: updatedGame }) => {
      console.log(`Move made in game ${moveGameId}`, updatedGame);
      if (moveGameId === gameId) {
        // Update game state directly from socket data
        setGameState({
          ...updatedGame,
          board: Array.isArray(updatedGame.board)
            ? updatedGame.board
            : JSON.parse(updatedGame.board),
        });
      }
    });

    socket.on("gameUpdated", ({ gameId: updatedGameId, game: updatedGame }) => {
      console.log(`Game updated: ${updatedGameId}`, updatedGame);
      if (updatedGameId === gameId) {
        setGameState({
          ...updatedGame,
          board: Array.isArray(updatedGame.board)
            ? updatedGame.board
            : JSON.parse(updatedGame.board),
        });
      }
    });

    return () => {
      socket.off("playerJoined");
      socket.off("moveMade");
      socket.off("gameUpdated");
    };
  }, [gameId]);

  // Additional effect to fetch game state when game ID changes
  useEffect(() => {
    if (gameId) {
      fetchGameState(gameId);
    }
  }, [gameId]);

  const fetchGameState = async (id) => {
    try {
      const response = await axios.get(`${backendUrl}/api/games/state/${id}`);
      console.log("Fetched game state:", response.data);
      setGameState({
        ...response.data,
        board: Array.isArray(response.data.board)
          ? response.data.board
          : JSON.parse(response.data.board),
      });
    } catch (error) {
      console.error("Failed to fetch game state:", error);
    }
  };

  const createGame = async (playerName, isSinglePlayer = false) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/games`, {
        player1: playerName,
        isAIGame: isSinglePlayer, // Pass the flag to indicate if it's an AI game
      });
      console.log("Game created:", response.data);
      setGameId(response.data.gameId);
      setPlayer(playerName);
      setPlayerName("");
      setGameState({
        ...response.data,
        board: Array.isArray(response.data.board)
          ? response.data.board
          : JSON.parse(response.data.board),
      });
      setErrorMessage("");

      // Join the socket room for real-time updates
      socket.emit("joinGame", {
        gameId: response.data.gameId,
        player: playerName,
      });

      // If this is an AI game, fetch the updated state after a short delay
      if (isSinglePlayer) {
        setTimeout(() => fetchGameState(response.data.gameId), 500);
      }
    } catch (error) {
      console.error("Failed to create game:", error);
      setErrorMessage("Failed to create game. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const joinGame = async (gameIdToJoin, joiningPlayerName) => {
    setIsLoading(true);
    try {
      // First, check if the game exists and is joinable
      const checkResponse = await axios.get(
        `${backendUrl}/api/games/state/${gameIdToJoin}`
      );
      const gameData = checkResponse.data;

      if (!gameData) {
        setErrorMessage("Game not found.");
        setIsLoading(false);
        return;
      }

      if (gameData.status !== "waiting") {
        setErrorMessage("This game is already in progress or finished.");
        setIsLoading(false);
        return;
      }

      // If checks pass, join the game
      const response = await axios.post(`${backendUrl}/api/games/join`, {
        gameId: gameIdToJoin,
        player: joiningPlayerName,
      });

      console.log("Joined game:", response.data);
      setGameId(gameIdToJoin);
      setPlayer(joiningPlayerName);
      setPlayerName("");

      // Update game state with the joined game data
      setGameState({
        ...response.data,
        board: Array.isArray(response.data.board)
          ? response.data.board
          : JSON.parse(response.data.board),
      });

      // Join the socket room for this game
      socket.emit("joinGame", {
        gameId: gameIdToJoin,
        player: joiningPlayerName,
      });

      // Emit a special event to notify all clients that the game has been joined
      socket.emit("gameJoined", {
        gameId: gameIdToJoin,
        player: joiningPlayerName,
      });

      setErrorMessage("");
    } catch (error) {
      console.error("Failed to join game:", error);
      setErrorMessage(
        "Failed to join game. Make sure the Game ID is correct and the game is not full."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const spectateGame = async (gameIdToSpectate) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${backendUrl}/api/games/state/${gameIdToSpectate}`
      );
      console.log("Spectating game:", response.data);
      setGameId(gameIdToSpectate);
      setGameState({
        ...response.data,
        board: Array.isArray(response.data.board)
          ? response.data.board
          : JSON.parse(response.data.board),
      });
      setIsSpectator(true);
      setErrorMessage("");

      // Join the socket room for this game as a spectator
      socket.emit("joinGame", {
        gameId: gameIdToSpectate,
        player: "spectator",
      });
    } catch (error) {
      console.error("Failed to spectate game:", error);
      setErrorMessage(
        "Failed to spectate game. Make sure the Game ID is correct."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const makeMove = async (position) => {
    if (isSpectator) {
      setErrorMessage("Spectators cannot make moves.");
      return;
    }

    if (gameState.currentTurn !== player) {
      setErrorMessage("It's not your turn.");
      return;
    }

    // Check if the position is already taken
    if (gameState.board[position] !== "") {
      setErrorMessage("This position is already taken.");
      return;
    }

    try {
      console.log("Making move:", { gameId, player, position });
      const response = await axios.post(`${backendUrl}/api/games/move`, {
        gameId,
        player,
        position,
      });
      console.log("Move response:", response.data);
      setGameState({
        ...response.data,
        board: Array.isArray(response.data.board)
          ? response.data.board
          : JSON.parse(response.data.board),
      });
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to make move:", error.response?.data || error);
      setErrorMessage(
        error.response?.data?.error || "Failed to make move. Please try again."
      );
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gameId);
    setNotification("Game ID copied to clipboard!");
    setTimeout(() => setNotification(""), 3000);
  };

  const getCurrentBoard = () => {
    if (gameState && gameState.board) {
      return Array.isArray(gameState.board)
        ? gameState.board
        : JSON.parse(gameState.board);
    }
    return Array(9).fill("");
  };

  const getPlayerSymbol = () => {
    if (!gameState || !player) return "";
    return player === gameState.player1 ? "X" : "O";
  };

  const resetGame = () => {
    setGameId("");
    setPlayer("");
    setPlayerName("");
    setGameState({
      board: Array(9).fill(""),
      currentTurn: "",
      status: "waiting",
    });
    setIsSpectator(false);
    setErrorMessage("");
    setNotification("");
    setGameIdToJoin("");
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Tic Tac Toe</h1>
      {notification && <div className="notification">{notification}</div>}
      {!gameId ? (
        <div className="game-setup">
          <h2>Create or Join a Game</h2>
          <input
            type="text"
            placeholder="Enter Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="input-field"
          />
          <div className="button-group">
            <button
              className="btn primary"
              onClick={() => createGame(playerName || "Player1", true)}
              disabled={isLoading}
            >
              {isLoading ? "Creating Game..." : "Play Against AI"}
            </button>
            <button
              className="btn primary"
              onClick={() => createGame(playerName || "Player1", false)}
              disabled={isLoading}
            >
              {isLoading ? "Creating Game..." : "Create Game (Multiplayer)"}
            </button>
          </div>
          <div className="join-section">
            <input
              type="text"
              placeholder="Enter Game ID"
              value={gameIdToJoin}
              onChange={(e) => setGameIdToJoin(e.target.value)}
              className="input-field"
            />
            <div className="button-group">
              <button
                className="btn secondary"
                onClick={() => joinGame(gameIdToJoin, playerName || "Player2")}
                disabled={isLoading || !gameIdToJoin}
              >
                {isLoading ? "Joining Game..." : "Join Game"}
              </button>
              <button
                className="btn secondary"
                onClick={() => spectateGame(gameIdToJoin)}
                disabled={isLoading || !gameIdToJoin}
              >
                {isLoading ? "Loading..." : "Spectate Game"}
              </button>
            </div>
          </div>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
      ) : (
        <div className="game-container">
          {gameState ? (
            <div>
              <h2>Game ID: {gameId}</h2>
              <button className="btn copy-btn" onClick={copyToClipboard}>
                Copy Game ID
              </button>
              <h3>Status: {gameState.status}</h3>

              {gameState.status === "waiting" && (
                <div className="waiting-message">
                  <h3>Waiting for opponent to join...</h3>
                  <p>Share the Game ID with your friend</p>
                </div>
              )}

              {gameState.status !== "waiting" && (
                <h3>
                  Current Turn:{" "}
                  {gameState.currentTurn === player
                    ? "Your Turn"
                    : gameState.currentTurn === "AI"
                    ? "AI's Turn"
                    : "Opponent's Turn"}
                </h3>
              )}

              {!isSpectator && (
                <h3>
                  You are: {player} ({getPlayerSymbol()})
                </h3>
              )}
              {isSpectator && <h3>Spectating mode</h3>}

              <div className="players-info">
                <p>Player 1 (X): {gameState.player1}</p>
                <p>
                  Player 2 (O):{" "}
                  {gameState.player2 || "Waiting for player to join..."}
                </p>
              </div>

              <Board
                board={getCurrentBoard()}
                makeMove={makeMove}
                isMyTurn={
                  gameState.currentTurn === player &&
                  !isSpectator &&
                  gameState.status === "in-progress"
                }
                gameStatus={gameState.status}
              />

              {gameState.status === "finished" && (
                <div className="game-over">
                  <h3 className="winner-message">
                    {gameState.winner === "draw"
                      ? "It's a draw!"
                      : gameState.winner === player
                      ? "You won!"
                      : "You lost!"}
                  </h3>
                  <button className="btn primary" onClick={resetGame}>
                    New Game
                  </button>
                </div>
              )}

              <button
                className="btn secondary"
                onClick={resetGame}
                style={{ marginTop: "20px" }}
              >
                Exit Game
              </button>
            </div>
          ) : (
            <h3>Loading game state...</h3>
          )}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
      )}
    </div>
  );
};

export default App;
