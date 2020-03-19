import Discord = require("discord.js");
import {DiscordBot} from "./DiscordBot";
import { BoardLibrary } from "./BoardLibrary";
import Express = require("express");
import { readFileSync } from "fs";

const json = JSON.parse(readFileSync("./config.json", 'utf8'));

const client = new Discord.Client();
const boards = new BoardLibrary();
const discordbot = new DiscordBot(new Discord.Client(), boards, json["url"], json["token"]);

const instantCloseWebpage = readFileSync("./autoclose.html", 'utf8');

const app = Express();
const port = Number(json["port"]);
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

app.get('*', (req, res) => {
    res.statusCode = 200;
    const codeMaybe = req.url.replace('/', '');
    if (codeMaybe.length != 4) {
        res.statusCode = 400;
        res.send(instantCloseWebpage);
        return;
    }

    const data = Buffer.from(codeMaybe, 'base64');

    const fullBitMask = data[0] << 16 | data[1] << 8 | data[2];
    const x = fullBitMask & 0xF;
    const y = (fullBitMask & 0xF0) >> 4;
    const gameID = (fullBitMask & 0xFFFF00) >> 8;
    
    const board = boards.boardFromID(gameID);

    if (!board) {
        res.statusCode = 400;
        res.send(instantCloseWebpage);
        return;
    }

    board.clear(x, y);

    discordbot.editGameMessage(board);

    if (board.GameOver) {
        boards.removeBoard(board.ID);
    }

    res.send(instantCloseWebpage)
});

