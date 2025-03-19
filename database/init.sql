CREATE TABLE game_rooms (
    id SERIAL PRIMARY KEY,
    player1 VARCHAR(255) NOT NULL,
    player2 VARCHAR(255),
    board TEXT NOT NULL,
    current_turn VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_rooms_status ON game_rooms(status);

INSERT INTO game_rooms (player1, board, current_turn, status) VALUES
('Player1', '---------', 'Player1', 'waiting');