const { fetchUrban, fetchOxford } = require('../utils/requests');

const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
class Room {
    constructor(name) {
        this.name = name
        this.users = []
        this.messages = []
        this.dictionary = false;
        this.hangman = {
            master: {},
            isChoosing: false,
            word: [],
            hint: '',
            remainingLetters: [...alphabet],
            selectedLetters: [],
            skip: 0,
            turn: {},
            isCorrect: false,
            incorrect: 0,
            gameOver: false,
            numGames: 0
        }
        this.timeout = null
    }
    addUser(id, name) {
        let roomName = this.name
        const newUser = { id, name, room: roomName, score: 0 }
        this.users.push(newUser)
        return [newUser, this.dictionary]
    }
    getRoomUsers() {
        return this.users
    }
    getNumUsers() {
        return this.users.length
    }
    getUser(id) {
        return this.users.filter((user) => user.id === id)[0]
    }
    removeUser(id) {
        return this.users = this.users.filter((user) => {
            return user.id !== id
        })
    }
    checkRoomForUser(name) {
        return this.users.filter((user) => user.name === name).length !== 0
    }
    setDictionary(dict) {
        this.dictionary = dict;
        return
    }
    addMessage(message) {
        this.messages.push(message)
        return this.messages
    }
    setMaster() {
        this.hangman.isChoosing = true
        this.hangman.master = this.users[this.hangman.numGames >= this.getNumUsers() ? this.hangman.numGames % this.getNumUsers() : this.hangman.numGames]
        return this.hangman
    }
    getMaster() {
        return this.hangman.master
    }
    deleteMaster() {
        this.hangman.master = {};
        this.hangman.isChoosing = false;
        this.hangman.turn = {
            name: ''
        }
        return this.hangman
    }

    selectLetter(selectedLetter) {
        if (this.hangman.gameOver) {
            return this.hangman
        }
        if (selectedLetter && !this.hangman.selectedLetters.includes(selectedLetter)) {
            this.hangman.selectedLetters.push(selectedLetter);
            this.hangman.word.includes(selectedLetter) ? this.hangman.turn.score++ : this.hangman.incorrect++
        }
        this.hangman.remainingLetters = this.hangman.remainingLetters.filter((letter) => letter !== selectedLetter)
        return this.hangman
    }
    async setWordAndHint(word, hint) {
        word = word.toUpperCase()
        if (!hint) {
            if (this.dictionary === 'Urban') {
                return fetchUrban(word.toLowerCase())
                    .then((def) => {
                        this.hangman.hint = def
                        if (def) {
                            this.hangman.isChoosing = false;
                            this.hangman.word = word.split('');
                        }
                        return Promise.resolve(this.hangman)
                    }).catch((e) => {
                        throw (e)
                    })
            } else if (this.dictionary === 'Oxford') {
                return fetchOxford(word.toLowerCase())
                    .then((def) => {
                        this.hangman.hint = def
                        if (def) {
                            this.hangman.isChoosing = false;
                            this.hangman.word = word.split('');
                        }
                        return Promise.resolve(this.hangman)
                    }).catch((e) => {
                        throw (e)
                    })
            }
        } else {
            this.hangman.isChoosing = false;
            this.hangman.word = word.split('');
            this.hangman.hint = hint
            return this.hangman
        }


    }
    whoseTurn() {
        if (this.hangman.gameOver) {
            this.hangman.turn = {
                name: ''
            };
            return this.hangman
        }
        if (this.hangman.incorrect >= 5) {
            this.hangman.gameOver = true;
            this.hangman.master.score += 5
            return this.hangman
        }
        if (!this.hangman.gameOver) { this.hangman.gameOver = this.checkForWin() }
        this.hangman.isCorrect = this.checkForWin()
        let { selectedLetters, master, skip } = this.hangman
        let players = this.users
            .filter((user) => user.name !== master.name)
        if (players.length < 1) { return this.hangman }
        this.hangman.turn = players[selectedLetters.length + skip >= players.length ? (selectedLetters.length + skip) % players.length : selectedLetters.length + skip]

        return this.hangman
    }
    skipTurn() {
        this.hangman.skip++;
        this.hangman.incorrect++;
        return this.whoseTurn();
    }
    checkForWin() {
        if (this.hangman.word.length < 3) {
            return false
        }
        for (let letter of this.hangman.word) {
            if (!this.hangman.selectedLetters.includes(letter)) {
                return false
            }
        }
        return true
    }
    newGame() {
        this.hangman.numGames++;
        this.hangman = {
            ...this.hangman,
            remainingLetters: [...alphabet],
            selectedLetters: [],
            turn: {
                name: ''
            },
            hint: '',
            skip: 0,
            isCorrect: false,
            incorrect: 0,
            gameOver: false
        }
        return this.setMaster()
    }
}
class Rooms {
    constructor() {
        this.rooms = {}
        Object.values(this.rooms)
            .reduce((acc, { users }) => {
                acc.concat(users)
            }, [])
    }
    getAllUsers() {
        return Object.values(this.rooms)
            .reduce((acc, { users }) => {
                return acc.concat(users)
            }, [])
    }
    getUserById(id) {
        return this.getAllUsers().filter((user) => {
            return user.id === id
        })[0]
    }
    getMetaData() {
        return Object.values(this.rooms).map((room) => {
            return {
                name: room.name,
                numUsers: room.getNumUsers(),
                dictionary: room.dictionary
            }
        })
    }
    addRoom(name) {
        const newRoom = new Room(name)
        this.rooms[name] = newRoom
    }
    getRooms() {
        return Object.keys(this.rooms)
    }
    getRoom(name) {
        return this.rooms[name]
    }
    deleteRoom(name) {
        let deleted;
        if (this.rooms[name]) {
            delete this.rooms[name];
            deleted = true
        } else {
            deleted = false
        }
        return deleted
    }
    updateRooms() {
        for (let room in this.rooms) {
            if (this.rooms[room].getNumUsers() < 1) {
                this.deleteRoom(room)
            }
        }
    }
}
module.exports = { Room, Rooms }