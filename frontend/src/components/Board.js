import React from "react";
import "./styles/Board.css";

const Board = ({ board, makeMove }) => {
  const renderSquare = (index) => {
    return (
      <div className="square" onClick={() => makeMove(index)}>
        {board[index]}
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
