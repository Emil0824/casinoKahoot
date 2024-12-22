const socket = io('http://localhost:3000', {
    reconnection: true, 
    reconnectionAttempts: 5, 
    reconnectionDelay: 1000, 
});

socket.emit('createRoom');
let players = {};
let gameInfo = { game: "lobby" };
let roomCode;

socket.on('createdRoom', (roomCode) => {
    console.log("room created, code: " + roomCode);
    roomCode = roomCode;
    document.querySelector(".nr-code").innerHTML = roomCode.toString();

});

socket.on('playerJoined', (username, userId) => {
    console.log(players);
    console.log(username + " joined the room");

    players[userId] = { username: username, points: 0, status: "connected" };
    updatePlayerList();
});

socket.on('playerLeft', (userId) => {
    console.log(players);
    console.log(userId)
    
    try {
        console.log(players[userId].username + " left the room");

        if (gameInfo.game === "lobby") {
            delete players[userId];
            updatePlayerList();
        } else {
            players[userId].status = "disconnected";
        }
    } catch (error) {
        console.log(error);
    }
});

function updatePlayerList() {
    const playerList = document.querySelector('.players');
    playerList.innerHTML = '';

    for (const [userId, player] of Object.entries(players)) {
        const playerElement = document.createElement('li');
        playerElement.className = 'player';
        playerElement.innerHTML = player.username;
        playerList.appendChild(playerElement);
    }
}

socket.on('reconnect', (userId) => {
    players[userId].status = "connected";
    console.log(players[userId].username + " reconnected");
    console.log(players);
});

socket.on('gameStarted', () => {
    console.log('Game started');
    gameInfo.game = "gameSelect";
    document.querySelector('body').innerHTML = `
        <h1>Game select</h1>
        <p id="blackjack">BlackJack</p>
    `;
});

socket.on('gameSelected', (game) => {
    console.log('Game selected:', game);
    gameInfo.game = game;
    document.getElementById('blackjack').style.backgroundColor = 'green';

    startGame(game)
});

function startGame(game) {
    switch (game) {
        case 'BlackJack':
            initBlackJack();
            break;
    
        default:
            break;
    }
}



//  -------------------------------------------------------- blackjack logic --------------------------------------------------------
let hands = {};
let round = 0;


function initBlackJack() {
    console.log('Starting BlackJack');
    round = 0;
    document.querySelector('body').innerHTML = '';

    const dealer = document.createElement('div');
    dealer.className = 'blackjack-dealer';
}
