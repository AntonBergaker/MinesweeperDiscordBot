export {DiscordBot};
import Discord = require("discord.js");
import {BoardLibrary} from "./BoardLibrary";
import {Board} from "./Board";
import * as utils from "./utils";

type Route = (message: Discord.Message) => Promise<void>;

class DiscordBot {

    private client : Discord.Client;
    private boards : BoardLibrary;
    private url : string;
    private identifiers : string[];
    private routes: Map<string, Route>;

    constructor(client : Discord.Client, identifier: string|string[], boards : BoardLibrary, url : string, token : string) {
        this.client = client;
        this.boards = boards;
        this.url = url;
        if (typeof identifier == "string") {
            identifier = [identifier];
        }
        this.identifiers = identifier;
        client.on('ready', () => {
            console.log(`Logged in as ${client.user.tag}!`);
        });
        
        client.on('message', (msg) => this.handleMessage(msg));
        
        client.login(token);

        this.routes = new Map();
        const unsortedRoutes : [string[], Route][] = [
            [["begin", "start", "init", "new"], this.newGameRoute.bind(this)],
            [["remove", "stop", "delete"], this.removeGameRoute.bind(this)]
        ]

        for (const [commands, route] of unsortedRoutes) {
            for (const command of commands) {
                this.routes.set(command, route);
            }
        }
    }

    private async handleMessage(msg : Discord.Message) {
        const content = msg.content;
        const words = content.split(' ');

        if (words.length <= 0) {
            return;
        }
        // return if you did not start the message with the identifier
        if (this.identifiers.includes(words[0]) == false) {
            return;
        }
        if (words.length <= 1) {
            return;
        }
        const identifier = words[1];
        const route = this.routes.get(identifier);
        if (!route) {
            return;
        }

        route(msg);
    }

    private async newGameRoute(msg: Discord.Message) {
        const content = msg.content;
        const channelBoard = this.boards.boardForChannel(msg.channel.id);

        if (channelBoard) {
            msg.reply(`This channel already has an active board: ${channelBoard.message.url}\nTo remove the old game use \`minesweeper remove\``);
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

    private async removeGameRoute(msg: Discord.Message) {
        const channelBoard = this.boards.boardForChannel(msg.channel.id);

        if (!channelBoard) {
            msg.reply("This channel doesn't have a board. You can create one with `minesweeper start`.")
            return;
        }

        let removePermission = false;
        if (channelBoard.message.member.id == msg.member.id) {
            removePermission = true;
        } else if (msg.member.hasPermission("ADMINISTRATOR") || msg.member.hasPermission("MANAGE_MESSAGES")) {
            removePermission = true;
        }

        if (removePermission == false) {
            msg.reply("Only the creator of a board or an admin can remove it.")
            return;
        }
        
        channelBoard.message.delete();
        this.boards.removeBoard(channelBoard.ID);
    }

    private getEmbed(board: Board) : Discord.RichEmbed {
        let description = board.print(this.url);

        if (description.length > 2048) {
            return new Discord.RichEmbed().setDescription("Error: board exceeds 2048 characters. Use a shorter url or change the max board size.");
        }

        if (board.GameOver) {
            let seconds = Math.floor(board.getElapsedSeconds() / 1000);
            let hours = Math.floor(seconds / 60 / 60);
            seconds-=hours*60*60;
            let minutes = Math.floor(seconds / 60);
            seconds -= minutes*60;
            let string = "";
            if (hours > 0) {
                string += hours.toString() + (hours == 1 ? " hour" : " hours" + ", ");
            }
            if (minutes > 0) {
                string += minutes.toString() + (minutes == 1 ? " minute" : " minutes" + ", ");
            }
            string += seconds.toString() + (seconds == 1 ? " second" : " seconds");
            description = `\nPlayed for: ${string}\n\n${description}`;
        }

        return new Discord.RichEmbed()
            .setTitle(board.printLeft())
            .setDescription(description)
            .setColor(0x4EAF51)
            .setFooter("Made by Anton Bergåker");
    }

    public async postGameMessage(channel : Discord.TextChannel | Discord.DMChannel | Discord.GroupDMChannel, board : Board) : Promise<Discord.Message> {
        const sentMessage = await channel.send(this.getEmbed(board));
        if (sentMessage instanceof Discord.Message) {
            return sentMessage;
        }
        else {
            return sentMessage[0];
        }
    }

    public async editGameMessage(board : Board) {
        const sentMessage = board.message;
        sentMessage.edit(this.getEmbed(board));
    }
}
