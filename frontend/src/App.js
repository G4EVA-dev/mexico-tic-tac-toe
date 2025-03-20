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
  const [gameState, setGameState] = useState({
    board: Array(9).fill(""),
    currentTurn: "",
    status: "waiting",
  });
  const [isSpectator, setIsSpectator] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (gameId) {
      socket.emit("joinGame", { gameId, player });

      socket.on("playerJoined", ({ gameId, player }) => {
        console.log(`${player} joined game ${gameId}`);
        // Refresh game state when a player joins
        fetchGameState(gameId);
      });

      socket.on("moveMade", ({ gameId }) => {
        console.log(`Move made in game ${gameId}`);
        // Fetch the updated game state from the backend
        fetchGameState(gameId);
      });
    }

    return () => {
      socket.off("playerJoined");
      socket.off("moveMade");
    };
  }, [gameId, player]);

  const fetchGameState = async (id) => {
    try {
      const response = await axios.get(`${backendUrl}/api/games/state/${id}`);
      console.log("Fetched game state:", response.data);
      setGameState({
        ...response.data,
        board: JSON.parse(response.data.board),
      });
    } catch (error) {
      console.error("Failed to fetch game state:", error);
    }
  };

  const createGame = async (player1, isSinglePlayer = false) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/games`, {
        player1,
      });
      console.log("Game created:", response.data);
      setGameId(response.data.gameId);
      setPlayer(player1);
      setGameState({
        ...response.data,
        board: JSON.parse(response.data.board),
      });
      setErrorMessage("");

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

  const joinGame = async (gameId, playerName) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/games/join`, {
        gameId,
        player: playerName,
      });
      console.log("Joined game:", response.data);
      setGameId(gameId);
      setPlayer(playerName);
      setGameState({
        ...response.data,
        board: JSON.parse(response.data.board),
      });
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to join game:", error);
      setErrorMessage("Failed to join game. Make sure the Game ID is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  const spectateGame = async (gameId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${backendUrl}/api/games/state/${gameId}`
      );
      console.log("Spectating game:", response.data);
      setGameId(gameId);
      setGameState({
        ...response.data,
        board: JSON.parse(response.data.board),
      });
      setIsSpectator(true);
      setErrorMessage("");
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
        board: JSON.parse(response.data.board),
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
    setErrorMessage("Game ID copied to clipboard!");
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
    setGameState({
      board: Array(9).fill(""),
      currentTurn: "",
      status: "waiting",
    });
    setIsSpectator(false);
    setErrorMessage("");
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Tic Tac Toe</h1>
      {!gameId ? (
        <div className="game-setup">
          <h2>Create or Join a Game</h2>
          <div className="button-group">
            <button
              className="btn primary"
              onClick={() => createGame("Player1", true)}
              disabled={isLoading}
            >
              {isLoading ? "Creating Game..." : "Play Against AI"}
            </button>
            <button
              className="btn primary"
              onClick={() => createGame("Player1", false)}
              disabled={isLoading}
            >
              {isLoading ? "Creating Game..." : "Create Game (Multiplayer)"}
            </button>
          </div>
          <div className="join-section">
            <input
              type="text"
              placeholder="Enter Game ID"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="input-field"
            />
            <div className="button-group">
              <button
                className="btn secondary"
                onClick={() => joinGame(gameId, "Player2")}
                disabled={isLoading}
              >
                {isLoading ? "Joining Game..." : "Join Game"}
              </button>
              <button
                className="btn secondary"
                onClick={() => spectateGame(gameId)}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Spectate Game"}
              </button>
            </div>
          </div>
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
              <h3>Current Turn: {gameState.currentTurn}</h3>
              {!isSpectator && (
                <h3>
                  You are: {player} ({getPlayerSymbol()})
                </h3>
              )}
              {isSpectator && <h3>Spectating mode</h3>}
              <Board board={getCurrentBoard()} makeMove={makeMove} />
              {gameState.status === "finished" && (
                <div className="game-over">
                  <h3 className="winner-message">
                    Winner:{" "}
                    {gameState.winner === "draw"
                      ? "It's a draw!"
                      : gameState.winner}
                  </h3>
                  <button className="btn primary" onClick={resetGame}>
                    New Game
                  </button>
                </div>
              )}
            </div>
          ) : (
            <h3>Loading game state...</h3>
          )}
        </div>
      )}
      {errorMessage && <p className="error-message">{errorMessage}</p>}
    </div>
  );
};

export default App;
