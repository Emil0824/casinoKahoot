const cookieParser = require("cookie-parser");
const express = require("express");
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Import the CORS package

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://sip-royale.dannesteknikhorna.se",
        // origin: "*", // Allow all origins for WebSocket connections
        methods: ["GET", "POST"], // Allowed HTTP methods
        credentials: true,  // Allow cookies to be passed
    }
});

// Apply CORS middleware
app.use(cors({
    origin: "https://sip-royale.dannesteknikhorna.se",  // Allow your domain
    credentials: true,  // Allow cookies
}));

app.use(cookieParser());
app.use(express.static("static"));
app.use(express.urlencoded({ extended: false }));

require("./sockets.js")(io);
require("./routes.js")(app);

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
