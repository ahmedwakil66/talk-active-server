const express = require('express');
const app = express();
require('dotenv').config();
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const port = process.env.PORT || 5000;

// Import route files
const jwtRoutes = require('./routes/jwt')
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

// middle wires
app.use(cors());
app.use(express.json());

// Use route files as middleware
app.use('/jwt', jwtRoutes);
app.use('/users', userRoutes);
app.use('/messages', messageRoutes);


app.get('/', (req, res) => {
    res.send({ server: 'awake', message: `Talk Active server has been started on port ${port}` })
})


//===========================================================================================================//

// SOCKET.IO AREA STARTS HERE
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'https://talkactive-ca.web.app']
    }
})

io.on('connection', socket => {
    console.log(`User connected with ID: ${socket.id}`);
    socket.on('joinRoom', (data) => {
        socket.join(data.roomId);
        console.log(`${socket.id} joined room ${data.roomId}`)
    })

    socket.on('leaveRoom', (data) => {
        socket.leave(data.roomId);
        console.log(`${socket.id} LEFT room ${data.roomId}`)
    })

    socket.on('sendMessage', (data) => {
        console.log(data);
        socket.to(data.roomId).emit('receiveMessage', data.newMessage)
    })
})


server.listen(port, () => console.log(`Talk Active server has been started on port ${port}`))