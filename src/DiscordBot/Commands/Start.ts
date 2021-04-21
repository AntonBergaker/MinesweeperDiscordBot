import { Message } from "discord.js";
import { DiscordBot } from "../DiscordBot";
import { Command } from "./Command";
import * as utils from "../../utils";
import { BoardLibrary } from "../../BoardLibrary";
import { Config } from "../../Config";

export class Start extends Command {
    private boards: BoardLibrary;
    private config: Config;

    private maxWidth: number;
    private maxHeight: number;

    private _identifiers = ["start", "begin", "init", "new"];
    get identifiers() {return this._identifiers;}
    get helpIdentifier() {return "start [mines] [width] [height]"}
    get description() {
        const width = this.maxWidth;
        const height = this.maxHeight;
        const identifier = utils.getIdentifier(this.config);
        return ""+
`Starts a new game! You can optionally provide the mine count and the width and height.
Mine count can be given as a number or a percentage.
Width and height are limited to ${(width == height ? width : height + " and " + width)}.

*Examples:*
\`${identifier} start\` - starts a ${width}x${height} big board.
\`${identifier} start 10% 5 5\` - starts a 5x5 big board where 10% of cells are mines.
\`${identifier} start 10 7 5\` - starts a 7x5 big board with 10 mines.`;
    }
    
    constructor(bot: DiscordBot, boards: BoardLibrary, config: Config) {
        super(bot);
        this.boards = boards;
        this.config = config;
        this.maxWidth = config.max_width;
        this.maxHeight = config.max_height;
    }

    async handle(msg: Message) {
        const content = msg.content;
        const channelBoard = this.boards.boardForChannel(msg.channel.id);

        if (channelBoard) {
            msg.reply(`This channel already has an active board: ${channelBoard.message.url}\nTo remove the old game use \`${utils.getIdentifier(this.config)} stop\``);
            return;
        }

        const options = content.split(" ");

        let width = this.maxWidth
        if (options.length > 3 && Number(options[3]) != NaN) {
            width = utils.clamp(Number(options[3]), 1, 9);
        }

        let height = this.maxHeight;
        if (options.length > 4 && Number(options[4]) != NaN) {
            height = utils.clamp(Number(options[4]), 1, 9);
        }

        let mines = Math.round(width*height*0.12);
        if (options.length > 2) {
            const mineString = options[2];
            if (mineString.endsWith("%")) {
                const percentage = Number(mineString.slice(0, -1));
                if (percentage != NaN) {
                    mines = Math.round(width*height*percentage/100);
                }
            } else if (Number(mineString) != NaN) {
                mines = Number(mineString);
            }
            mines = utils.clamp(mines, 0, width*height-1);
        }

        console.log("Created a new " + width + "x" + height + " board with " + mines + " mines");
        const board = this.boards.makeBoard(width, height, mines, msg.channel.id, msg.author.id);
        const message = await this.bot.postGameMessage(msg.channel, board);
        board.message = message;
    }

}

