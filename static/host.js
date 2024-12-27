const socket = io('http://localhost:3000', {
    reconnection: true, 
    reconnectionAttempts: 5, 
    reconnectionDelay: 1000, 
});

socket.emit('createRoom');
let players = {};
let gameInfo = { game: "lobby" };

socket.on('createdRoom', (roomCode) => {
    console.log("room created, code: " + roomCode);
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
});

//  -------------------------------------------------------- blackjack logic --------------------------------------------------------

socket.on('initBlackJack', () => {
    console.log('Starting BlackJack');
    var gameInfo;
    let body = document.querySelector('body');
    body.innerHTML = '';
    body.className = 'body-blackjack';
    body.innerHTML = `
        <div class="header">Runda 1</div>
        
        <div class="dealer" id="dealer">
            <div class="cards">
                <div class="card"><img src="cards/klöver 4.png" alt="10 of Hearts"></div>
                <div class="card"><img src="cards/klöver 4.png" alt="7 of Spades"></div>
            </div>
        </div>
    `; 

    let table = document.createElement('div');
    table.className = 'table';

    let player = document.createElement('div');
    player.className = 'player';

    player.innerHTML = `
        <div class="score-board">
            <img src="chips-poker-svgrepo-com.png" alt="">
            <span>-20</span>
            <img src="poker-chip-svgrepo-com.png" alt="">
            <span>14</span>
        </div>
        <div class="cards">
            <img class="card" src="cards/klöver 4.png" alt="">
            <img class="card" src="cards/klöver 4.png" alt="">
            <img class="card" src="cards/klöver 4.png" alt="">
            <img class="card" src="cards/klöver 4.png" alt="">
        </div>
        <div>Benjamin</div>
    `;
    
    for (let i = 0; i < 12; i++) {
        table.appendChild(player.cloneNode(true));
    }

    body.appendChild(table);
});

socket.on('newBlackJackRound', (GameInfo) => {
    gameInfo = GameInfo;

    
    //draw board
});

socket.on('newBets', (playersInfo) => {
    players = playersInfo;
    //draw bets
});

socket.on('newCard', (playerId, card) => {
    //draw card on player
});

