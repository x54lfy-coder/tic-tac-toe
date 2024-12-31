const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let rooms = {}; // Keeps track of game rooms and their states

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('createRoom', () => {
        const roomID = Math.random().toString(36).substr(2, 6);
        rooms[roomID] = { players: [socket.id], gameState: Array(9).fill("") };
        socket.join(roomID);
        socket.emit('roomCreated', roomID);
    });

    socket.on('joinRoom', (roomID) => {
        if (rooms[roomID] && rooms[roomID].players.length < 2) {
            rooms[roomID].players.push(socket.id);
            socket.join(roomID);
            io.to(roomID).emit('startGame');
        } else {
            socket.emit('errorMessage', 'Room is full or does not exist.');
        }
    });

    socket.on('makeMove', ({ roomID, index, player }) => {
        const room = rooms[roomID];
        if (room && room.gameState[index] === "") {
            room.gameState[index] = player;
            io.to(roomID).emit('updateGame', room.gameState);

            // Check for a winner
            const winningConditions = [
                [0, 1, 2],
                [3, 4, 5],
                [6, 7, 8],
                [0, 3, 6],
                [1, 4, 7],
                [2, 5, 8],
                [0, 4, 8],
                [2, 4, 6]
            ];
            const winner = winningConditions.find(cond => cond.every(i => room.gameState[i] === player));

            if (winner) {
                io.to(roomID).emit('gameOver', { winner: player });
            } else if (room.gameState.every(cell => cell !== "")) {
                io.to(roomID).emit('gameOver', { winner: null }); // Draw
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const roomID in rooms) {
            const room = rooms[roomID];
            if (room.players.includes(socket.id)) {
                delete rooms[roomID];
                io.to(roomID).emit('playerDisconnected');
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
