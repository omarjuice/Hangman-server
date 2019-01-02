const express = require('express');
const app = express()
const dotenv = require('dotenv')
dotenv.config()
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
    socket.on('join', ({ name, room, dictionary }) => {

        if (!roomList[room]) {
            GameRooms.addRoom(room)
        }
        if (roomList[room] && !roomList[room].dictionary && !dictionary) {
            return socket.emit('askForDict', { room, name })
        }
        if (roomList[room] && dictionary && !roomList[room].dictionary) {
            roomList[room].setDictionary(dictionary)
        }
        if (roomList[room] && roomList[room].checkRoomForUser(name)) {
            return socket.emit('errorMessage', 'A user with that name already exists in that room')
        }
        if (roomList[room] && roomList[room].getNumUsers() > 4) {
            return socket.emit('errorMessage', 'That room is full!')
        }
        socket.join(room)

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
    socket.on('newWord', async ({ word, hint, room }) => {
        if (roomList[room]) {
            return roomList[room].setWordAndHint(word, hint)
                .then((hangman) => {
                    if (!hangman.hint) {
                        socket.emit('wordInfo', 'Could not find that word!')
                    } else {
                        io.to(room).emit('wordSet', hangman)
                    }
                })
                .catch((e) => {
                    if (e === 'No such entry found') {
                        return socket.emit('wordInfo', 'Could not find that word!')
                    }
                    socket.emit('errorMessage', 'Server Error')

                })
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
                }, 2500)
            }
        }
    })
    socket.on('skipMyTurn', (room) => {
        if (roomList[room]) {
            io.to(room).emit('nextTurn', roomList[room].skipTurn())
            io.to(room).emit('updateUserList', { userList: roomList[room].getRoomUsers() })
        }
    })
    socket.on('skipMaster', (room) => {
        if (roomList[room]) {
            io.to(room).emit('newMaster', roomList[room].newGame())
            io.to(room).emit('updateUserList', { userList: roomList[room].getRoomUsers() })
        }
    })

    socket.on('disconnect', () => {
        console.log('disconnected');
        let user = GameRooms.getUserById(socket.id)
        if (user) {
            let { room } = user
            if (room && roomList[room]) {
                io.to(room).emit('newMessage',
                    roomList[room].addMessage(generateMessage({
                        from: 'Admin',
                        text: `${user.name} has left.`
                    }))
                )
                io.to(room).emit('updateUserList', { userList: roomList[room].removeUser(socket.id) })
                io.to(room).emit('nextTurn', roomList[room].whoseTurn('bye'))

                if (user.name === roomList[room].hangman.master.name || roomList[room].getNumUsers() < 2) {
                    io.to(room).emit('newMaster', roomList[room].deleteMaster())
                }
            }
            GameRooms.updateRooms()
        }
    })
})

server.listen(process.env.PORT || 3001, function () {
    console.log('Server init')
})