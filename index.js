const express = require('express');
const app = express()
const dotenv = require('dotenv').config()
const cors = require('cors')
const http = require('http')
const socketIO = require('socket.io');
const server = http.createServer(app)
const io = socketIO(server)
const { Rooms } = require('./utils/Rooms')
const { generateMessage } = require('./utils/generateMessage');

const corsOptions = {
    origin: process.env.CLIENT,
    optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.get('/', function (req, res) {
    res.status(200).send('OK')
})

const GameRooms = new Rooms()
const roomList = GameRooms.rooms
io.on('connection', (socket) => {
    console.log('connected')
    io.emit('updateMetaData', GameRooms.getMetaData())
    GameRooms.updateRooms()
    socket.on('join', ({ name, room }) => {

        if (roomList[room] && roomList[room].checkRoomForUser(name)) {
            return socket.emit('errorMessage', 'A user with that name already exists in that room')
        }
        socket.join(room);
        if (!roomList[room]) {
            GameRooms.addRoom(room)
        }
        roomList[room].removeUser(socket.id)


        socket.emit('joinSuccess', roomList[room].addUser(socket.id, name))
        if (roomList[room].getNumUsers() > 1 && !roomList[room].getMaster().name) {
            io.to(room).emit('newMaster', roomList[room].setMaster())
        }
        io.to(room).emit('letterSelected', roomList[room].selectLetter(null))

        io.to(room).emit('updateUserList', { userList: roomList[room].getRoomUsers() })
        GameRooms.updateRooms()
        io.emit('updateMetaData', GameRooms.getMetaData())
    })
    socket.on('createMessage', ({ from, room, text }) => {
        if (roomList[room]) {
            io.to(room).emit('newMessage',
                roomList[room].addMessage(generateMessage({ from, text })
                ))
        }
        else {
            socket.emit('errorMessage', 'Disconnected from the server')
        }
    })
    socket.on('removeUser', ({ room, id }) => {
        if (roomList[room]) {
            io.to(room).emit('updateUserList', { userList: roomList[room].getRoomUsers() })
        }
    })
    socket.on('selectingLetter', ({ letter, room }) => {
        if (roomList[room]) {
            io.to(room).emit('letterSelected', roomList[room].selectLetter(letter))
        }
    })
    socket.on('newWord', ({ word, hint, room }) => {
        if (roomList[room]) {
            io.to(room).emit('wordSet', roomList[room].setWordAndHint(word, hint))
        }
    })
    socket.on('isItMyTurn', (room) => {
        if (roomList[room]) {
            io.to(room).emit('nextTurn', roomList[room].whoseTurn())
            io.to(room).emit('updateUserList', { userList: roomList[room].getRoomUsers() })
            if (roomList[room].hangman.gameOver && !roomList[room].timeout) {
                roomList[room].timeout = setTimeout(() => {
                    io.to(room).emit('nextTurn', roomList[room].newGame())
                    roomList[room].timeout = null
                }, 2000)
            }
        }
    })

    socket.on('disconnect', () => {
        console.log('disconnected');
        let user = GameRooms.getUserById(socket.id)
        if (user && roomList[user.room]) {

            io.to(user.room).emit('updateUserList', { userList: roomList[user.room].removeUser(socket.id) })
            io.to(user.room).emit('newMessage',
                roomList[user.room].addMessage(generateMessage({
                    from: 'Admin',
                    text: `${user.name} has left.`
                }))
            )
            io.to(user.room).emit('nextTurn', roomList[user.room].whoseTurn())
            if (user.name === roomList[user.room].hangman.master.name || roomList[user.room].getNumUsers() < 2) {
                io.emit('newMaster', roomList[user.room].deleteMaster())
            }
        }
        GameRooms.updateRooms()
    })
})

server.listen(process.env.PORT || 3001, function () {
    console.log('Server init')
})