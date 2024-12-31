var QRCode = require('qrcode');

const rooms = [];
const users = {};

module.exports = function(io) {

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);


        socket.on('createRoom', () => {
            roomCode = Math.floor(Math.random() * 10000);
            rooms[roomCode] = { host: socket.id, players: [], gameInfo: { game:"lobby" } };
            socket.join(roomCode)
            io.to(socket.id).emit('createdRoom', roomCode);
            console.log('Room created: ' + roomCode);

            //make qr code
            QRCode.toFile(`static/assets/qr-codes/${roomCode}.png`, `http://localhost:3000/join?roomCode=${roomCode}`, {
                
            });
            io.to(socket.id).emit('qrCode-ready', roomCode);
        });

        socket.on('joinRoom', (roomCode, username) => {
            if (rooms[roomCode] && rooms[roomCode].gameInfo.game === "lobby") {
                let userId = getUserIdFromSocket(socket);
                rooms[roomCode].players.push({ id: userId, username: username, points: 0 });
                socket.join(roomCode);
                io.to(rooms[roomCode].host).emit('playerJoined', username, userId);
                console.log(roomCode + '   Player joined a room: ' + username);
                socket.emit('joinedRoom');
            } else {
                socket.emit('error');
            }
        });

        socket.on('register', (userId) => {
            users[userId] = socket.id;
            console.log(`User registered: ${userId} with socket ID: ${socket.id}`);

            let roomHost = Object.values(rooms).find(room => room.players.some(player => player.id === userId))?.host;
            if (roomHost) {
                io.to(roomHost).emit('reconnect', userId);
                console.log('Reconnected ' + userId + ' to room: ' + roomHost);

                let roomCode = Object.keys(rooms).find(roomCode => rooms[roomCode].players.some(player => player.id === userId));
                socket.join(roomCode);

                if (Object.values(rooms).find(room => room.players.some(player => player.id === userId && player.isAdmin))) {
                    io.to(socket.id).emit('gainAdmin');
                }

                switch (rooms[roomCode].gameInfo.game) {
                    case 'BlackJack':
                        if (rooms[roomCode].players.find(player => player.id === userId).gameStatus === 'waiting') {
                            io.to(socket.id).emit('yourBlackjackTurn');
                        }
                        break;
                
                    default:
                        break;
                }
            
            } else {
                console.log('User not in a room');
                io.to(socket.id).emit('notInRoom');
            }
        });

        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);

            rooms.forEach((room, roomCode) => {
                if (room.host === socket.id) {
                    delete rooms[roomCode];
                    io.to(roomCode).emit('hostLeft');
                    console.log('Deleted room: ' + roomCode);
                } else {
                    room.players = room.players.filter(player => player.id !== socket.id);
                    io.to(roomCode).emit('playerLeft', getUserIdFromSocket(socket) );
                }
            });
        });

        socket.on('kickPlayer', (roomCode, userId) => {
            rooms[roomCode].players = rooms[roomCode].players.filter(player => player.id !== userId);
        });


        //Game logic
        socket.on('startGame', () => {  //from admin player, start game from lobby screen
            let adminId = getUserIdFromSocket(socket);
            let roomCode = getRoomCodeFromUserId(adminId);
            rooms[roomCode].gameInfo.game = "gameSelect";
            rooms[roomCode].players.
            forEach(player => {
                player.isAdmin = player.id === adminId
            });

            console.log('Game started in room: ' + roomCode);
            console.log('Admin is ' + rooms[roomCode].players.find(player => player.isAdmin).username);
            io.to(roomCode).emit('gameStarted');
            io.to(rooms[roomCode].host).emit('gameStarted');
        });

        socket.on('selectGame', (game) => {  //from admin player, selct game from gameSelect screen
            let userId = getUserIdFromSocket(socket);
            let roomCode = getRoomCodeFromUserId(userId)
            rooms[roomCode].gameInfo.game = game;
            console.log('Game selected in room: ' + roomCode);
            io.to(roomCode).emit('gameSelected', game);
            io.to(rooms[roomCode].host).emit('gameSelected', game);

            startGame(game, roomCode);
        });

        socket.on('setBet', (userId, bet) => {
            let roomCode = getRoomCodeFromUserId(userId);   //send view to host
            console.log(userId + ' bet: ' + bet);
            rooms[roomCode].players.find(player => player.id === userId).bet = bet;
            io.to(rooms[roomCode].host).emit('newBets', rooms[roomCode].players, userId);
        });

        socket.on('playerAction', async ( userId, action ) => {
            let roomCode = getRoomCodeFromUserId(userId);
            if (rooms[roomCode].players.find(player => player.id === userId).gameStatus ==='done') {
                return;
            }

            console.log(rooms[roomCode].players.find(player => player.id === userId).username + ": " + action);
            if (action === 'hit') {
                dealCard(roomCode, userId);
                await sleep(200);

                if (calculateHand(roomCode, userId) < 21) {
                    io.to(getSocketFromUserId(userId)).emit('yourBlackjackTurn');
                } else {
                    rooms[roomCode].players.find(player => player.id === userId).gameStatus = 'done';
                    io.to(rooms[roomCode].host).emit('bust', userId);
                }
            } else if (action === 'stand') {
                rooms[roomCode].players.find(player => player.id === userId).gameStatus = 'done';
                io.to(rooms[roomCode].host).emit('stand', userId);
            }
        });
    })

    function getRoomCodeFromUserId(userId) {
        return Object.keys(rooms).find(roomCode => rooms[roomCode].players.some(player => player.id === userId));
    }

    function getSocketFromUserId(userId) {
        return users[userId];
    }

    function getUserIdFromSocket(socket) {
        return Object.keys(users).find(key => users[key] === socket.id);
    }

    function sleep(ms) {
        return new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
    }

    function startGame(game, roomCode) {
        switch (game) {
            case 'BlackJack':
                initBlackJack(roomCode);
                break;
        
            default:
                break;
        }
    }

    function waitForBets(roomCode) {
        return new Promise((resolve) => {
            io.to(roomCode).emit('placeYourBetsNow');
            const interval = setInterval(() => {
                try {
                    console.log('Waiting for bets: ' + roomCode);
                    const allBetsPlaced = rooms[roomCode].players.every(player => player.bet > 0);
                    if (allBetsPlaced) {
                        clearInterval(interval);
                        console.log('All bets placed: ' + roomCode);
                        resolve();
                    }
                } catch (error) {
                    console.log('Error in waitForBets: ' + error);
                    console.log('player must have left');
                    clearInterval(interval);
                    resolve();
                }
            }, 1000);
        });
    }

    function resetBets(roomCode) {
        rooms[roomCode].players.forEach(player => {
            player.bet = 0;
        });
    }


    //  -------------------------------------------------------- blackjack logic --------------------------------------------------------

    function initBlackJack(roomCode) {
        console.log('Starting BlackJack: ' + roomCode);
        rooms[roomCode].gameInfo.round = 0;
        io.to(rooms[roomCode].host).emit('initBlackJack');

        newRound(roomCode);
    }

    async function newRound(roomCode) {
        rooms[roomCode].gameInfo.hands = {};
        rooms[roomCode].gameInfo.hands['dealer'] = [];
        rooms[roomCode].gameInfo.round++;
        resetBets(roomCode);
        console.log(rooms[roomCode].gameInfo)
        io.to(rooms[roomCode].host).emit('newBlackJackRound', rooms[roomCode].gameInfo, rooms[roomCode].players);
        
        await waitForBets(roomCode);
        console.log('Bets placed: ' + roomCode);

        if (rooms[roomCode] == undefined) {
            console.log('Room deleted');
            return;
        }
        console.log(rooms[roomCode].players);

        for (const player of rooms[roomCode].players) {
            rooms[roomCode].gameInfo.hands[player.id] = [];
            rooms[roomCode].players.find(playerU => playerU.id === player.id).gameStatus = 'done';

            dealCard(roomCode, player.id)
            await sleep(200);
            dealCard(roomCode, player.id)
            await sleep(200);
        }
        
        await sleep(1000);
        dealCard(roomCode, 'dealer')
        await sleep(1000);

        playerTurn(roomCode);
    }

    function dealCard(roomCode, userId) {
        let newCardId = Math.floor(Math.random() * 13) + 1;   //make decks
        let suitID = Math.floor(Math.random() * 4) + 1;
        switch (suitID) {
            case 1:
                suitID = 'H'
                break;
            case 2:
                suitID = 'D'
                break;
            case 3:
                suitID = 'S'
                break;
            case 4:
                suitID = 'C'
                break;
            default:
                break;
        }

        rooms[roomCode].gameInfo.hands[userId].push( {id: newCardId,value: newCardId > 10 ? 10 : newCardId} );
        console.log(`Dealt card to ${userId}: ${newCardId + suitID}`);
        
        //send view to host
        io.to(rooms[roomCode].host).emit('newCard', userId, newCardId + suitID);
    }

    function calculateHand(roomCode, userId) {
        let handValue = 0;
        let hasAce = false;

        rooms[roomCode].gameInfo.hands[userId].forEach(card => {
            handValue += card.value;
            if (card.value === 1) {
                hasAce = true;
            }
        });

        if (hasAce && handValue + 10 <= 21) {
            handValue += 10;
        }

        return handValue;
    }

    function playerTurn(roomCode) {
        console.log('Player turn');
        rooms[roomCode].players.forEach(player => {
            rooms[roomCode].players.find(playerU => playerU.id === player.id).gameStatus = 'waiting';
        });
        io.to(roomCode).emit('yourBlackjackTurn');

        const interval = setInterval(() => {
            try {
                let allPlayersDone = rooms[roomCode].players.every(player => player.gameStatus === 'done');
                if (allPlayersDone) {
                    clearInterval(interval);
                    dealerTurn(roomCode);
                }
            } catch (error) {
                return;
            }
        }, 1000);
    }

    async function dealerTurn(roomCode) {
        console.log('Dealer turn');
        let dealerHand = calculateHand(roomCode, 'dealer');

        while (dealerHand < 17) {
            dealCard(roomCode, 'dealer');
            await sleep(1000);
            dealerHand = calculateHand(roomCode, 'dealer');
        }

        if (dealerHand > 21) {
            io.to(rooms[roomCode].host).emit('bust', 'dealer');
        }

        await sleep(3000);
        endRound(roomCode);
    }

    function endRound(roomCode) {
        console.log('Round ended');
        console.log('Calculating winners');

        let dealerHand = calculateHand(roomCode, 'dealer');

        rooms[roomCode].players.forEach(player => {
            let playerHand = calculateHand(roomCode, player.id);
            let playerBet = parseInt(player.bet, 10);

            if (playerHand > 21) {
                player.points -= playerBet;
                io.to(rooms[roomCode].host).emit('playerScore', player.id, 'lose');
            } else if (playerHand > dealerHand || dealerHand > 21) {
                player.points += playerBet;
                io.to(rooms[roomCode].host).emit('playerScore', player.id, 'win');
            } else if (playerHand < dealerHand){
                player.points -= playerBet;
                io.to(rooms[roomCode].host).emit('playerScore', player.id, 'lose');
            }
        });

        io.to(rooms[roomCode].host).emit('roundEnd', rooms[roomCode].players);

        if (rooms[roomCode] == undefined) {
            console.log('Room deleted');
            return;
        }

        if (rooms[roomCode].gameInfo.round < 7) {
            newRound(roomCode);
        } else {
            io.to(rooms[roomCode].host).emit('gameEnd');
            rooms[roomCode].gameInfo.game = 'lobby';
        }
    }
}