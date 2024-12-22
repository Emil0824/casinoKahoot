let userId = localStorage.getItem('userId');
if (!userId) {
    userId = `user_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('userId', userId);
}

const socket = io('http://localhost:3000', {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
  
    // Send the userId to the server after connecting
    socket.emit('register', userId);
});

socket.on('notInRoom', () => {
    console.log('User not in a room');
    window.location.href = '/join';
});

socket.on('gainAdmin', () => {
    console.log('Admin gained');
    showAdminPanel();
});

const body = document.querySelector('body');

function showAdminPanel() {
    body.innerHTML = '';

    const adminPanel = document.createElement('div');
    adminPanel.className = 'admin-panel';
    adminPanel.innerHTML = `
        <h1>Admin panel</h1>
        <button id="blackjack-button">BlackJack</button>
        <button id="resume-blackjack-button">resume turn BlackJack</button>
    `;
    body.appendChild(adminPanel);

    const blackjackButton = document.getElementById('blackjack-button');
    blackjackButton.addEventListener('click', () => {
        selectGame('BlackJack');
    });

    const resumeBlackjackButton = document.getElementById('resume-blackjack-button');
    resumeBlackjackButton.addEventListener('click', () => {
        myTurnBlackJack();
    });
}

function selectGame(game) {
    console.log('Selected game:', game);
    socket.emit('selectGame', game);
}

socket.on('gameSelected', (game) => {
    console.log('Game selected:', game);

});

socket.on('placeYourBetsNow', () => {
    console.log('Place your bets');
    body.innerHTML = '';
    const betContainer = document.createElement('div');
    betContainer.className = 'bet-container';
    betContainer.innerHTML = `
        <h1>Place your bets</h1>
        <input type="number" id="bet-input" placeholder="Enter your bet">
        <button id="bet-button">Place bet</button>
    `;

    body.appendChild(betContainer);
    const submitBetButton = document.getElementById('bet-button');
    submitBetButton.addEventListener('click', () => {
        const bet = document.getElementById('bet-input').value;

        submitBet(bet);
    });
});

function submitBet(bet) {
    console.log('Submitting bet:', bet);
    socket.emit('setBet', userId, bet);

    body.innerHTML = `
        <h1>Waiting...</h1>
    `;
}

socket.on('yourBlackjackTurn', () => {
    myTurnBlackJack();
});

function myTurnBlackJack() {
    console.log('Your turn');

    body.innerHTML = `
        <div class="hit" id="hit-button">
            HIT
        </div>
        <div class="stand" id="stand-button">
            STAND
        </div>
    `;

    const hitButton = document.getElementById('hit-button');
    hitButton.addEventListener('click', () => {
        socket.emit('playerAction', userId, 'hit' );

        body.innerHTML = `
            <h1>Waiting...</h1>
        `;
    });

    const standButton = document.getElementById('stand-button');
    standButton.addEventListener('click', () => {
        socket.emit('playerAction', userId, 'stand' );

        body.innerHTML = `
            <h1>Waiting...</h1>
        `;
    });
}