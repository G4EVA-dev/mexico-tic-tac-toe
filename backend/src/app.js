const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const gameRoutes = require("./routes/gameRoutes");

const app = express();
const server = http.createServer(app);

// Enable CORS for HTTP requests
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from your frontend
    credentials: true, // Allow cookies and credentials
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Allow WebSocket connections from your frontend
    methods: ["GET", "POST"], // Allowed HTTP methods
    credentials: true, // Allow credentials
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

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
