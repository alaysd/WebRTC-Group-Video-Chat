const express = require('express');
const app = express();
const server = require('http').createServer(app);
let fs = require('fs');
const options = {
    key: fs.readFileSync('encryption/key.pem'),
    cert: fs.readFileSync('encryption/cert.pem')
};
const https = require('https').createServer(options, app);
const io = require('socket.io')(https);
const { v4: uuidv4 } = require('uuid');

app.use(express.static('./public'));

app.get('/createRoom', (req, res) => {
    let newUUID = uuidv4();
    // let newUUID = '123';
    return res.json({
        'room-id': newUUID
    });
});

app.get('/joinRoom', (req, res) => {
    let roomId = req.query['roomId'];
    if(io.sockets.adapter.rooms.has(roomId) === true) {
        return res.status(200).send('Everything Cool !');
    }
    else {
        return res.status(400).send('No Room with such an ID');
    }
});

io.on('connect', (socket) => {
    socket.on('join', (data) => {
        if(io.sockets.adapter.rooms.has(data['room-id']) === true) {
            socket.join(data['room-id']);
            socket.broadcast.in(data['room-id']).emit('room-joined', data);
        }
        else {
            socket.join(data['room-id']);
        }
    });

    socket.on('send-metadata', (data) => {
        socket.to(data['peer-id']).emit('send-metadata', data);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data['peer-id']).emit('ice-candidate', data);
    });

    socket.on('offer', (data) => {
        socket.to(data['peer-id']).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data['peer-id']).emit('answer', data);
    });

    socket.on('disconnect', (reason) => {
        socket.broadcast.emit('client-disconnected', { 'client-id': socket.id });
    });
});

const port = process.env.PORT || 3000;

https.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
});
