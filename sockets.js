
const rooms = [];
const users = {};

module.exports = function(io) {

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);


        socket.on('createRoom', () => {
            roomCode = Math.floor(Math.random() * 10000);
            rooms[roomCode] = { host: socket.id, players: [], gameInfo: { game:"lobby" } };
            socket.join(roomCode)
            io.to(socket.id).emit('createdRoom', roomCode)
            console.log('Room created: ' + roomCode);
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
                }
            } else if (action === 'stand') {
                rooms[roomCode].players.find(player => player.id === userId).gameStatus = 'done';
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
                console.log('Waiting for bets: ' + roomCode);
                const allBetsPlaced = rooms[roomCode].players.every(player => player.bet > 0);
                if (allBetsPlaced) {
                    clearInterval(interval);
                    console.log('All bets placed: ' + roomCode);
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

        //tell host game init

        newRound(roomCode);
    }

    async function newRound(roomCode) {
        rooms[roomCode].gameInfo.hands = {};
        rooms[roomCode].gameInfo.hands['dealer'] = [];
        rooms[roomCode].gameInfo.round++;
        resetBets(roomCode);
        //send view to host
        await waitForBets(roomCode);
        console.log('Bets placed: ' + roomCode);

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
        dealCard(roomCode, 'dealer')
        await sleep(1000);

        playerTurn(roomCode);
    }

    function dealCard(roomCode, userId) {
        let newCardId = Math.floor(Math.random() * 13) + 1;   //make decks
        rooms[roomCode].gameInfo.hands[userId].push( {id: newCardId, value: newCardId > 10 ? 10 : newCardId} );
        console.log(`Dealt card to ${userId}: ${newCardId}`);
        
        //send view to host
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
            let allPlayersDone = rooms[roomCode].players.every(player => player.gameStatus === 'done');
            if (allPlayersDone) {
                clearInterval(interval);
                dealerTurn(roomCode);
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

        //send view to host
        endRound();
    }

    function endRound() {
        console.log('Round ended');
        
    }
}