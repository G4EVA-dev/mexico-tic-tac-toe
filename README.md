# Tic Tac Toe Web Application

This project is a Tic Tac Toe web application built using Express.js for the backend, React.js for the frontend, and PostgreSQL for the database. It supports both single-player and multiplayer modes.

## Project Structure

```
tic-tac-toe-app
├── backend
│   ├── src
│   │   ├── app.js
│   │   ├── controllers
│   │   │   └── gameController.js
│   │   ├── models
│   │   │   └── gameModel.js
│   │   ├── routes
│   │   │   └── gameRoutes.js
│   │   └── db
│   │       └── index.js
│   ├── package.json
│   ├── .env
│   └── Dockerfile
├── frontend
│   ├── public
│   │   └── index.html
│   ├── src
│   │   ├── components
│   │   │   ├── Board.js
│   │   │   └── Square.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── styles
│   │       └── App.css
│   ├── package.json
│   ├── .env
│   └── Dockerfile
├── database
│   ├── init.sql
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Docker and Docker Compose

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd tic-tac-toe-app
   ```

2. Set up the backend:

   - Navigate to the backend directory:
     ```
     cd backend
     ```
   - Install dependencies:
     ```
     npm install
     ```
   - Create a `.env` file with your database connection settings.

3. Set up the frontend:

   - Navigate to the frontend directory:
     ```
     cd ../frontend
     ```
   - Install dependencies:
     ```
     npm install
     ```
   - Create a `.env` file for frontend configuration.

4. Set up the database:

   - Navigate to the database directory:
     ```
     cd ../database
     ```
   - Create the database and run the initialization script using the `init.sql` file.

### Running the Application

You can run the application using Docker Compose:

```
docker-compose up --build
```

This command will build and start all services defined in the `docker-compose.yml` file.

### Deployment

To deploy the application, ensure that your environment variables are correctly set in the `.env` files for both the backend and frontend. You can use Docker to containerize the application and deploy it to your preferred cloud provider.

### Architecture Overview

- **Backend**: The backend is built with Express.js and handles game logic, API endpoints, and database interactions.
- **Frontend**: The frontend is a React.js application that provides the user interface for the game.
- **Database**: PostgreSQL is used to store game states and player information.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.