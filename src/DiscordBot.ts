export {DiscordBot};
import Discord = require("discord.js");
import {BoardLibrary} from "./BoardLibrary";
import {Board} from "./Board";
import * as utils from "./utils";

class DiscordBot {
    private client : Discord.Client;
    private boards : BoardLibrary;
    private url : string;

    constructor(client : Discord.Client, boards : BoardLibrary, url : string, token : string) {
        this.client = client;
        this.boards = boards;
        this.url = url;
        client.on('ready', () => {
            console.log(`Logged in as ${client.user.tag}!`);
        });
        
        client.on('message', (msg) => this.handleMessage(msg));
        
        client.login(token);
    }

    private async handleMessage(msg : Discord.Message) {
        const validStarts = ["minesweeper init", "minesweeper start", "minesweeper begin"];
        const content = msg.content;

        // return if nothing matches
        if (validStarts.some(x => content.startsWith(x)) == false) {
            return;
        }

        const channelBoard = this.boards.boardForChannel(msg.channel.id);

        if (channelBoard) {
            msg.reply("This channel already has an active board, " + channelBoard.message.url);
            return;
        }

        const options = content.split(" ");
        if (options.length < 2) {
            return;
        }

        let width = 9;
        if (options.length > 3 && Number(options[3]) != NaN) {
            width = utils.clamp(Number(options[3]), 1, 9);
        }

        let height = 9;
        if (options.length > 4 && Number(options[4]) != NaN) {
            height = utils.clamp(Number(options[4]), 1, 9);
        }

        let mines = Math.floor(width*height*0.12);
        if (options.length > 2 && Number(options[2]) != NaN) {
            mines = utils.clamp(Number(options[2]), 0, width*height-1);
        }

        console.log("Created a new " + width + "x" + height + " board with " + mines + " mines");
        const board = this.boards.makeBoard(width, height, mines, msg.channel.id);
        const message = await this.postGameMessage(msg.channel, board);
        board.message = message;
    }

    private getEmbed(board: Board) : Discord.RichEmbed {
        return new Discord.RichEmbed().setDescription(board.print(this.url));
    }

    public async postGameMessage(channel : Discord.TextChannel | Discord.DMChannel | Discord.GroupDMChannel, board : Board) : Promise<Discord.Message> {
        const sentMessage = await channel.send(board.printLeft(), this.getEmbed(board));
        if (sentMessage instanceof Discord.Message) {
            return sentMessage;
        }
        else {
            return sentMessage[0];
        }
    }

    public async editGameMessage(board : Board) {
        const sentMessage = board.message;
        sentMessage.edit(board.printLeft(), this.getEmbed(board));
    }
}
