const functions = require("firebase-functions");
const cookieParser = require("cookie-parser");
const express = require("express");
const http = require('http');
const { Server } = require('socket.io');
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({extended:false}));

require("./sockets.js")(io);
require("./routes.js")(app);

exports.socketServer = functions.https.onRequest(app);