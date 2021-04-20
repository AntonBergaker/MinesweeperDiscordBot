import * as Discord from "discord.js";
import { DiscordBot } from "../DiscordBot";

export abstract class Command {
    protected bot: DiscordBot;
    
    abstract get identifiers(): string[];
    abstract get description(): string;
    abstract get helpIdentifier(): string;

    abstract handle(msg: Discord.Message): void;

    constructor(bot: DiscordBot) {
        this.bot = bot;
    }
}
