let userId = localStorage.getItem('userId');
if (!userId) {
    userId = `user_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('userId', userId);
}

const socket = io({
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

let currentBet = 0;

socket.on('placeYourBetsNow', () => {
    console.log('Place your bets');
    body.innerHTML = `
        <header class="absolute w-full z-10 flex bg-black">
            <div class="mx-auto">
                <p class="text-white py-4">Placera ditt bet!</p>
            </div>
        </header>
        <main class="absolute w-full flex flex-col h-full bg-gradient-to-b from-green-950 to-green-700">
            <!-- Betting -->
            <div class="flex flex-col items-center mt-28">
                <button
                    id="increaseBet"
                    class="relative rotate-180 w-0 h-0 border-l-[50px] border-l-transparent border-t-[75px] border-t-black border-r-[50px] border-r-transparent">
                    <span class="absolute -top-[4.4rem] -left-[0.9rem] text-5xl text-green-500">+</span>
                </button>
                <div class="relative flex justify-center items-center my-10">
                    <img class="w-40 bg-white rounded-full p-1 border-black" src="assets/chip_black.png" alt="">
                    <p id="bet" class="absolute block text-white pl-1 pb-1 text-6xl">0</p>
                </div>
                <button
                    id="decreaseBet"
                    class="relative w-0 h-0 border-l-[50px] border-l-transparent border-t-[75px] border-t-black border-r-[50px] border-r-transparent">
                    <span class="absolute -top-[5.5rem] -left-[1rem] text-7xl text-red-500">-</span>
                </button>
            </div>
            <div class="mx-auto pt-16">
                <button
                    id="betButton"
                    class="inline-block bg-black text-3xl text-white border-2 border-white py-2 px-14 rounded-xl">Betta</button>
            </div>
        </main>
    `;

    const submitBetButton = document.getElementById('betButton');
    submitBetButton.addEventListener('click', () => {
        submitBet(currentBet);
    });

    const increaseBetButton = document.getElementById('increaseBet');
    increaseBetButton.addEventListener('click', () => {
        console.log('Increase bet');
        console.log(currentBet);

        currentBet++;
        console.log(currentBet);
        document.getElementById('bet').innerText = currentBet;
    });

    const decreaseBetButton = document.getElementById('decreaseBet');
    decreaseBetButton.addEventListener('click', () => {
        if (currentBet > 0) {
            currentBet--;
            document.getElementById('bet').innerText = currentBet
        }
    });
});

var waitingHTML = `
    <header class="absolute w-full z-10 flex bg-black">
        <div class="mx-auto">
            <p class="text-white py-4">Vänta på nästa runda...</p>
        </div>
    </header>
    <main class="absolute w-full flex flex-col h-full bg-gradient-to-b from-green-950 to-green-700">
        <!-- Choose -->
        <div class="flex justify-center items-center my-auto">
            <img class="w-80 border-black animate-pulse" src="assets/hour_glass.png" alt="">
        </div>
    </main>
`;

function submitBet(bet) {
    console.log('Submitting bet:', bet);
    socket.emit('setBet', userId, bet);

    body.innerHTML = waitingHTML;
}

socket.on('yourBlackjackTurn', () => {
    myTurnBlackJack();
});

function myTurnBlackJack() {
    console.log('Your turn');

    body.innerHTML = `
        <header class="absolute w-full z-10 flex bg-black">
            <div class="mx-auto">
                <p class="text-white py-4">Välj dra kort eller stanna</p>
            </div>
        </header>
        <main class="absolute w-full flex flex-col h-full bg-gradient-to-b from-green-950 to-green-700">
            <!-- Choose -->
            <div id="hit-button" class="mx-auto pt-16 mt-48">
                <button class="inline-block bg-black text-3xl text-white border-2 border-white py-2 px-14 rounded-xl">Dra
                    kort</button>
            </div>
            <div id="stand-button" class="mx-auto pt-16">
                <button
                    class="inline-block bg-black text-3xl text-white border-2 border-white py-2 px-14 rounded-xl">Stanna</button>
            </div>
        </main>
    `;

    const hitButton = document.getElementById('hit-button');
    hitButton.addEventListener('click', () => {
        socket.emit('playerAction', userId, 'hit');

        body.innerHTML = waitingHTML;
    });

    const standButton = document.getElementById('stand-button');
    standButton.addEventListener('click', () => {
        socket.emit('playerAction', userId, 'stand');

        body.innerHTML = waitingHTML;
    });
}