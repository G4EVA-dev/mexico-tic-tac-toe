import React from "react";
import "./styles/Board.css";

const Board = ({
  board,
  makeMove,
  isMyTurn = true,
  gameStatus = "in-progress",
}) => {
  const renderSquare = (index) => {
    const value = board[index];
    const isClickable = !value && isMyTurn && gameStatus === "in-progress";

    return (
      <div
        className={`square ${isClickable ? "clickable" : ""}`}
        onClick={() => isClickable && makeMove(index)}
      >
        {value === "X" ? (
          <span className="x-mark">X</span>
        ) : value === "O" ? (
          <span className="o-mark">O</span>
        ) : (
          ""
        )}
      </div>
    );
  };

  return (
    <div className="board-container">
      <div className="board">
        {[0, 1, 2].map((row) => (
          <div key={row} className="board-row">
            {[0, 1, 2].map((col) => renderSquare(row * 3 + col))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Board;
