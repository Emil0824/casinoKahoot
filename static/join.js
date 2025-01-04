let userId = localStorage.getItem('userId');
if (!userId) {
    userId = `user_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('userId', userId);
}


const urlParams = new URLSearchParams(window.location.search);
const roomCodeFromUrl = urlParams.get('roomCode');
if (roomCodeFromUrl) {
    document.querySelector('.room-code').value = roomCodeFromUrl;
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

let roomCode;
let username;
function joinGame() {
    roomCode = document.querySelector('.room-code').value;
    username = document.querySelector('.username').value;
    socket.emit('joinRoom', roomCode, username);
}

socket.on('joinedRoom', () => {
    console.log('Joined room');

    document.querySelector('body').innerHTML = `
    <div class="bg-black text-white">
        <h1>Waiting for other players...</h1>
        <button onclick="startGame()" class="join text-xl bg-blue-600 mt-20 px-10 py-2 rounded xl">Start Game</button>
    </div>
    `;
});

socket.on('error', () => {
    console.log('Error:');
});

socket.on('startGame', () => {
    console.log('Game started');
    window.location.href = '/play';
});

function startGame() {
    socket.emit('startGame', roomCode);
}

socket.on('gameStarted', () => {
    console.log('Game started');
    window.location.href = '/play';
});