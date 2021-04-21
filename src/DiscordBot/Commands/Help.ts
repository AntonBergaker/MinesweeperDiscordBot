import { Message, RichEmbed } from "discord.js";
import { DiscordBot } from "../DiscordBot";
import { Command } from "./Command";
import * as Discord from "discord.js";
import * as utils from "../../utils";
import { Config } from "../../Config";

export class Help extends Command {
    private commands: Command[];
    private config: Config;

    private _identifiers = ["help", "what"];
    get identifiers() {return this._identifiers;}
    get description() {return "Shows all available commands";}
    get helpIdentifier() {return "help";}

    constructor(bot: DiscordBot, config: Config, commands: Command[]) {
        super(bot);
        this.commands = commands;
        this.config = config;
    }

    async handle(msg: Message) {

        const embed = new Discord.RichEmbed().setColor(0x4EAF51);
        
        for (let i=0;i<this.commands.length;i++) {
            if (i != 0) {
                embed.addField("\u200b", "‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾");
            }
            const command = this.commands[i];
            embed.addField(utils.getIdentifier(this.config) + " " + command.helpIdentifier, command.description);
        }

        msg.channel.send(
            "**Available Commands**", embed
        );
    }

}

