const jwt = require("jsonwebtoken");

module.exports = function(app) {

    app.get("/", (req, res) => {
        res.sendFile(__dirname + "/static/home.html");
    });

    app.get("/host", (req, res) => {
        res.sendFile(__dirname + "/static/host.html");
    });

    app.get("/join", (req, res) => {
        res.sendFile(__dirname + "/static/join.html");
    });

    app.get("/play",(req, res) => {
        res.sendFile(__dirname + "/static/play.html");
    });
}