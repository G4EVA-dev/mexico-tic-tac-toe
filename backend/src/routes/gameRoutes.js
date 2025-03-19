const express = require("express");
const GameController = require("../controllers/gameController");

function gameRoutes(io) {
  const router = express.Router();
  const gameController = new GameController(io);

  // Define routes
  router.post("/", gameController.createGame.bind(gameController));
  router.post("/join", gameController.joinGame.bind(gameController));
  router.get(
    "/state/:gameId",
    gameController.getGameState.bind(gameController)
  );
  router.post("/move", gameController.makeMove.bind(gameController));

  return router;
}

module.exports = gameRoutes;
