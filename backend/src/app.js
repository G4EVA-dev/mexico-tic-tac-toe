const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const gameRoutes = require("./routes/gameRoutes");
const { query } = require("./db/index");
const app = express();
const server = http.createServer(app);

const frontendUrl = "https://mexico-tic-tac-toe.vercel.app";

// Enable CORS for HTTP requests
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: frontendUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Set up routes and pass io to gameRoutes
app.use("/api/games", gameRoutes(io));

// WebSocket connection
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("joinGame", ({ gameId, player }) => {
    socket.join(gameId); // Join the game room
    console.log(`${player} joined game ${gameId}`);
    io.to(gameId).emit("playerJoined", { gameId, player });
  });

  socket.on("makeMove", ({ gameId, player, position }) => {
    const game = gameController.games[gameId];
    if (game) {
      // Emit the move to all players in the room
      io.to(gameId).emit("moveMade", { gameId, player, position });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Example route
app.get("/api/test", (req, res) => {
  res.json({ message: "CORS is working!" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await query("SELECT NOW()");
    res.json({ success: true, time: result.rows[0].now });
  } catch (error) {
    console.error("Database connection error:", error);
    res
      .status(500)
      .json({ success: false, error: "Database connection failed" });
  }
});
// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
