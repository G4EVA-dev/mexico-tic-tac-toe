import React, { useState, useEffect } from "react";
import axios from "axios";
import Board from "./components/Board";
import "./styles/App.css";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true, // Allow credentials
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
      });

      socket.on("moveMade", ({ gameId, player, position }) => {
        console.log(`Move made by ${player} at position ${position}`);
        // Fetch the updated game state from the backend
        spectateGame(gameId);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [gameId, player]);

  const createGame = async (player1, isSinglePlayer = false) => {
    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/games", {
        player1,
      });
      setGameId(response.data.gameId);
      setPlayer(player1);
      setGameState({
        ...response.data,
        board: Array(9).fill(""), // Ensure board is initialized
        currentTurn: player1,
        status: "waiting",
      });
      setErrorMessage("");
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
      const response = await axios.post(
        "http://localhost:5000/api/games/join",
        {
          gameId,
          player: playerName,
        }
      );
      setGameId(gameId);
      setPlayer(playerName);
      setGameState(response.data);
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
        `http://localhost:5000/api/games/state/${gameId}`
      );
      setGameId(gameId);
      setGameState(response.data);
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

    try {
      const response = await axios.post(
        "http://localhost:5000/api/games/move",
        {
          gameId,
          player,
          position,
        }
      );
      setGameState(response.data);
      setErrorMessage("");
    } catch (error) {
      console.error("Failed to make move:", error);
      setErrorMessage(
        "Failed to make move. Check if it's your turn or the position is valid."
      );
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gameId);
    setErrorMessage("Game ID copied to clipboard!");
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
              <Board board={gameState.board} makeMove={makeMove} />
              {gameState.status === "finished" && (
                <h3 className="winner-message">
                  Winner:{" "}
                  {gameState.winner === "draw"
                    ? "It's a draw!"
                    : gameState.winner}
                </h3>
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
