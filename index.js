const cookieParser = require("cookie-parser");
const express = require("express");
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Import the CORS package

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for WebSocket connections
        methods: ["GET", "POST"], // Allowed HTTP methods
    }
});

// Apply CORS middleware
app.use(cors({
    origin: (origin, callback) => callback(null, true), // Dynamically allow all origins
    credentials: true, // Allow cookies
}));

app.use(cookieParser());
app.use(express.static("static"));
app.use(express.urlencoded({ extended: false }));

require("./sockets.js")(io);
require("./routes.js")(app);

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
