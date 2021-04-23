import * as Discord from "discord.js";
import {DiscordBot} from "./DiscordBot/DiscordBot";
import { BoardLibrary } from "./BoardLibrary";
import * as Express from "express";
import { readFileSync } from "fs";
import * as CookieParser from "cookie-parser";

import * as config from "../config.json";

const client = new Discord.Client();
const boards = new BoardLibrary();
const discordbot = new DiscordBot(client, boards, config);

const instantCloseWebpage = readFileSync("./pages/autoclose.html", 'utf8');
const clickedCellWebpage = instantCloseWebpage.replace("{INSERT_TEXT_HERE}", "Beep boop you clicked a cell. This window should close automatically, so hopefully you don't see this.");
const setFlaggingWebpage = instantCloseWebpage.replace("{INSERT_TEXT_HERE}", "Beep boop you're now flagging. This window should close automatically, so hopefully you don't see this.");
const removeFlaggingWebpage = instantCloseWebpage.replace("{INSERT_TEXT_HERE}", "Beep boop you're no longer flagging. This window should close automatically, so hopefully you don't see this.");
const unknownWebpage = readFileSync("./pages/unknown.html", 'utf8');

const app = Express();
const port = Number(config["port"]);

app.use(CookieParser())
app.listen(port, () => console.log(`Example app listening on port ${port}!`));


app.get('/set-flagging/*', (req, res) => {
    res.statusCode = 200;

    const parts = req.url.split('/');
    const lastSegment = parts.pop() || parts.pop();
    
    const gameId = Number(lastSegment);
    const board = boards.boardFromID(gameId);

    if (!board) {
        res.statusCode = 400;
        res.send(unknownWebpage);
        return;
    }

    res.cookie(lastSegment + '_flagging', true, { maxAge: 15*60*1000 })
    res.send(setFlaggingWebpage)
});

app.get('/remove-flagging/*', (req, res) => {
    res.statusCode = 200;

    const parts = req.url.split('/');
    const lastSegment = parts.pop() || parts.pop();
    
    const gameId = Number(lastSegment);
    const board = boards.boardFromID(gameId);

    if (!board) {
        res.statusCode = 400;
        res.send(unknownWebpage);
        return;
    }

    res.clearCookie(lastSegment + '_flagging');
    res.send(removeFlaggingWebpage)
});

app.get('*', (req, res) => {
    res.statusCode = 200;
    const codeMaybe = req.url.replace('/', '');
    if (codeMaybe.length != 4) {
        res.statusCode = 400;
        res.send(unknownWebpage);
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
        res.send(unknownWebpage);
        return;
    }

    const isFlagging = req.cookies[gameID + '_flagging'] != undefined;

    const hadAChange = board.click(x, y, isFlagging);

    if (hadAChange) {
        const limitEnd = board.rateLimiter.limitEnd();
        const now = Date.now();
        if (now > limitEnd) {
            discordbot.editGameMessage(board);
        } else {
            board.rateLimiter.runOnEnd( () => {
                discordbot.editGameMessage(board);
            });
        }
    }

    if (board.gameOver) {
        boards.removeBoard(board.id);
    }

    res.send(instantCloseWebpage)
});