import { Message } from "discord.js";
import { DiscordBot } from "../DiscordBot";
import { Command } from "./Command";
import { BoardLibrary } from "../../BoardLibrary";
import { Config } from "../../Config";
import * as utils from "../../utils";

export class Stop extends Command {
    private _identifiers = ["stop", "remove", "delete"]
    private boards: BoardLibrary;
    private config: Config;
    
    get identifiers() {return this._identifiers;}
    get helpIdentifier() {return "stop";}
    get description() {return "Removes a game in progress. Only useable by the person who started the game, or someone with permission to remove messages.";}
    
    constructor(bot: DiscordBot, boards: BoardLibrary, config: Config) {
        super(bot);
        this.boards = boards;
        this.config = config;
    }

    handle(msg: Message) {
        const channelBoard = this.boards.boardForChannel(msg.channel.id);

        if (!channelBoard) {
            msg.reply(`This channel doesn't have a board. You can create one with \`${utils.getIdentifier(this.config)} start\`.`)
            return;
        }

        let removePermission = false;
        if (channelBoard.boardStarterId == msg.member.id) {
            removePermission = true;
        } else if (msg.member.hasPermission("ADMINISTRATOR") || msg.member.hasPermission("MANAGE_MESSAGES")) {
            removePermission = true;
        }

        if (removePermission == false) {
            msg.reply("Only the creator of a board or an admin can remove it.")
            return;
        }

        channelBoard.message.delete();
        this.boards.removeBoard(channelBoard.id);
    }

}

