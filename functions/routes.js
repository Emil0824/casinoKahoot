const path = require("path");

module.exports = function(app) {

    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/index.html"));
    });

    app.get("/host", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/host.html"));
    });

    app.get("/join", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/join.html"));
    });

    app.get("/play",(req, res) => {
        res.sendFile(path.join(__dirname, "../public/play.html"));
    });
}