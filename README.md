# Please note

This project was made in collaboration with someone who left two weeks before the deadline.
All features work, but the frontend lacks the polish it could've had.
The backend is feature complete, I have not had the time to complete and test the frontend.
Because the two are tightly coupled, I couldn't switch to the provided frontend.

# Project Setup Guide

## Prerequisites
Make sure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [MongoDB](https://www.mongodb.com/) (Ensure MongoDB service is running)
- [Git](https://git-scm.com/) (Optional, for cloning the repository)

## Installation Steps

### 1. Clone the Repository
If you haven’t already, clone the project repository:
```sh
git clone git@github.com:averyowl/chat.git
cd chat
```

### 2. Install Dependencies
You'll need to install dependencies for the base project, backend, and frontend.

#### Install Base Dependencies
```sh
npm install
```

#### Install Backend Dependencies
```sh
cd backend
npm install
cd ..
```

#### Install Frontend Dependencies
```sh
cd frontend
npm install
cd ..
```

### 3. Setup Environment Variables
Ensure the `.env` file in the `backend` folder has the correct information:
```
MONGO_URI=mongodb://localhost:27017/counter
PORT=5000
```

Ensure MongoDB is running on your system before starting the project.

### 4. Start the Project
Run the following command from the project root directory:
```sh
npm start
```
This will start both the backend and frontend concurrently.

- The backend will run on `http://localhost:5000`
- The frontend (Vite) will run on `http://localhost:5173` (default Vite port)

### 5. Verify Setup
- Open your browser and navigate to `http://localhost:5173`.
- Check the backend by visiting `http://localhost:5000`.
- Ensure MongoDB is running and connected properly.

## Testing

The backend has a testing framework set up:
```sh
cd backend
npm test
```

## Troubleshooting

### MongoDB Connection Issues
If MongoDB isn't running, start it with:
```sh
sudo mongod
```
Or, if you're using a MongoDB service, ensure it's active:
```sh
sudo systemctl start mongod
```

### Port Conflicts
If `5000` or `5173` is already in use, modify the `.env` file or `vite.config.js` accordingly.

### Nodemon Not Restarting
If nodemon doesn’t restart properly, manually restart the backend:
```sh
cd backend
npm run server
```

## Additional Notes
- The frontend uses Vite, so if you make changes to `vite.config.js`, restart the frontend server.
- The backend uses `nodemon` for automatic reloads on file changes.
- Update dependencies periodically with:
  ```sh
  npm update
  ```

