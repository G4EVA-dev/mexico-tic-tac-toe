const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

class Game {
    constructor(id, player1, player2, board, currentPlayer, status) {
        this.id = id;
        this.player1 = player1;
        this.player2 = player2;
        this.board = board;
        this.currentPlayer = currentPlayer;
        this.status = status;
    }

    static async createGame(player1) {
        const result = await pool.query(
            'INSERT INTO games (player1, board, current_player, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [player1, JSON.stringify(Array(9).fill(null)), player1, 'ongoing']
        );
        return new Game(...result.rows[0]);
    }

    static async getGameById(id) {
        const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
        if (result.rows.length) {
            return new Game(...result.rows[0]);
        }
        throw new Error('Game not found');
    }

    async updateGame(board, currentPlayer, status) {
        const result = await pool.query(
            'UPDATE games SET board = $1, current_player = $2, status = $3 WHERE id = $4 RETURNING *',
            [JSON.stringify(board), currentPlayer, status, this.id]
        );
        Object.assign(this, result.rows[0]);
    }
}

module.exports = Game;