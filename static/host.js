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

socket.on('qrCode-ready', (roomCode) => {
    console.log("qrCode ready");
    document.querySelector(".qr-code").innerHTML = `<img src="assets/qr-codes/${roomCode}.png" alt="qr-code">`;
});

socket.on('playerJoined', (username, userId) => {
    console.log(players);
    console.log(username + " joined the room");

    players[userId] = { username: username, status: "connected", gameStatus: "none" };
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
    document.querySelector('body').innerHTML = '';

    //remove style.css
    const link = document.querySelector('link[rel=stylesheet][href="style.css"]');
    if (link) {
        link.parentNode.removeChild(link);
    }
    
    //create board
    document.querySelector('body').innerHTML = `
    <!-- <div class="relative w-screen h-screen bg-green-700"> -->
    <div class="absolute inset-0 rounded-[0px] bg-black"></div>
    <div class="absolute inset-4 rounded-[36px] bg-gradient-to-b from-green-950 to-green-700 overflow-hidden">
        <!-- Status -->
        <div class="flex">
            <div class="flex mx-auto bg-wood-pattern bg-cover w-96 rounded-bl-full rounded-br-full shadow-xl">
                <p class="inline-block mx-auto pt-1 pb-2 text-xl text-white drop-shadow-md" id="runda">Runda 0</p>
            </div>
        </div>
        <!-- Dealer -->
        <div class="flex relative mt-2 w-[13.5rem] min-card-height mx-auto" id="dealer">
            
        </div>
        <!-- Board -->
        <main class="flex flex-wrap justify-center py-4 px-8 gap-x-10 ">

        </main>
    </div>
    </div>
    `;

    //add players
    for (const [userId, player] of Object.entries(players)) {
        document.querySelector('main').innerHTML += `
            <!-- Player panel -->
            <div class="flex flex-col items-center  relative player-panel">
                <div class="flex items-center justify-between text-white px-2 py-4 w-full bg-wood-pattern rounded-md" id="${userId + 'panel'}">
                    <div class="flex items-center">
                        <img class="w-10" src="assets/chips_white.png" alt="">
                        <p class="text-2xl">0</p>
                    </div>
                    <div class="relative flex justify-center items-center">
                        <img class="pl-2 w-16" src="assets/chip_black.png" alt="">
                        <p class="absolute block pl-1 pb-1 text-xl">0</p>
                    </div>
                </div>
                <!-- Cards -->
                <div class="flex relative mt-2 w-[13.5rem] min-card-height" id="${userId}">

                </div>
                <div class="text-lg text-white m-2 px-2 py-1 bg-neutral-800 border-2 border-black rounded-full">
                    <div>${player.username}</div>
                </div>
            </div>
        `
    }
});

socket.on('newBlackJackRound', (GameInfo, playersInfo) => {
    gameInfo = GameInfo;
    console.log(playersInfo);

    document.getElementById('runda').innerHTML = `Runda ${gameInfo.round}`;

    //reset cards
    document.getElementById('dealer').innerHTML = '';

    for (const [userId, player] of Object.entries(playersInfo)) {
        console.log(playersInfo[userId]);
        document.getElementById(playersInfo[userId].id).innerHTML = ''; //reset cards AND set new points
        setPlayerBoard(playersInfo, playersInfo[userId].id);
        players[playersInfo[userId].id].gameStatus = "betting";
    }
});

socket.on('newBets', (playersInfo, userId) => {
    players[userId].gameStatus = "none";
    setPlayerBoard(playersInfo, userId);
});

function setPlayerBoard(playersInfo, userId) {
    console.log(playersInfo);
    console.log(userId);
    //set bet and points for player
    document.getElementById(userId + 'panel').innerHTML = `
        <div class="flex items-center">
            <img class="w-10" src="assets/chips_white.png" alt="">
            <p class="text-2xl">${playersInfo.find(player => player.id === userId).points}</p>
        </div>
        <div class="relative flex justify-center items-center">
            <img class="pl-2 w-16" src="assets/chip_black.png" alt="">
            <p class="absolute block pl-1 pb-1 text-xl">${playersInfo.find(player => player.id === userId).bet}</p>
        </div>
    `;
}

socket.on('newCard', (playerId, card) => {
    //draw card on player
    if (document.getElementById(playerId).innerHTML === '') {
        document.getElementById(playerId).innerHTML += `
            <div class="relative mx-auto z-0">
                <img class="w-[7.5rem]" src="assets/cards/${card}.svg" alt="">
            </div>
        `;
    } else {
        document.getElementById(playerId).innerHTML += `
            <div class="relative mx-auto -ml-[6rem] z-10">
                <img class="w-[7.5rem] drop-shadow-sm" src="assets/cards/${card}.svg" alt="">
            </div>
        `;
    }
});

socket.on('playerScore', (userID, outcome) => {
    console.log(userID + " " + outcome);

    //indicate that someone has won or lost
});

socket.on('gameEnd', () => {
    //Show end screen
});