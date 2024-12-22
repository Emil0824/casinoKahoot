const cookieParser = require("cookie-parser");
const express = require("express");
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(function(req, res, next)
{
    next();
});

app.use(cookieParser());
app.use(express.static("static"));
app.use(express.urlencoded({extended:false}));


require("./sockets.js")(io);
require("./routes.js")(app);


server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});