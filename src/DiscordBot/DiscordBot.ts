import * as Discord from "discord.js";
import {BoardLibrary} from "../BoardLibrary";
import {Board} from "../Board";
import { Help } from "./Commands/Help";
import { Start } from "./Commands/Start";
import { Stop } from "./Commands/Stop";
import { Command } from "./Commands/Command";
import { Config } from "../Config"
import { printedList } from "../utils";
import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";

export class DiscordBot {
    private token : string;
    private client : Discord.Client;
    private boards : BoardLibrary;
    private url : string;
    private identifiers : string[];
    private commands: Map<string, Command>;

    constructor(boards: BoardLibrary, config: Config) {
        this.boards = boards;
        this.url = config.url;
        this.token = config.token;
        if (typeof config.identifier == "string") {
            this.identifiers = [config.identifier];
        } else {
            this.identifiers = config.identifier;
        }

        this.client = new Discord.Client();
        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}!`);
        });
        this.client.on('message', (msg) => this.handleMessage(msg));
        
        this.client.login(config.token);

        this.commands = new Map();
        const unsortedCommands : Command[] = [];
        unsortedCommands.push(
            new Help(this, config, unsortedCommands),
            new Start(this, boards, config),
            new Stop(this, boards, config)
        );

        for (const command of unsortedCommands) {
            for (const identifier of command.identifiers) {
                this.commands.set(identifier, command);
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
        const command = this.commands.get(identifier);
        if (!command) {
            return;
        }

        command.handle(msg);
    }

    private getEmbed(board: Board) : Discord.RichEmbed {
        let description = board.print(this.url);

        if (description.length > 2048) {
            return new Discord.RichEmbed().setDescription("Error: board exceeds 2048 characters. Use a shorter url or change the max board size.");
        }

        if (board.gameOver) {
            const date = new Date(board.getElapsedMS());

            const hours =  date.getUTCHours();
            const minutes = date.getUTCMinutes();
            const seconds = date.getUTCSeconds();
            
            const times = [];

            if (hours > 0) {
                times.push(hours.toString() + (hours == 1 ? " hour" : " hours"));
            }
            if (minutes > 0) {
                times.push(minutes.toString() + (minutes == 1 ? " minute" : " minutes"));
            }
            times.push(seconds.toString() + (seconds == 1 ? " second" : " seconds"));
            description = `\nPlayed for ${printedList(times)}\n\n${description}`;
        }

        return new Discord.RichEmbed()
            .setTitle(board.printLeft())
            .setDescription(description)
            .setColor(0x4EAF51)
            .addField('\u200b', board.printMode(this.url))
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
        // Use discordjs to guarantee delivery, otherwise use axios where it wont retry automatically on failed delivery
        if (board.gameOver) {
            board.message.edit(this.getEmbed(board));
            return;
        }
        
        const self = this;
        recursiveFunction(5);
        function recursiveFunction(triesLeft: number) {
            triesLeft--;
            if (triesLeft <= 0) {
                return;
            }
            board.rateLimiter.runNowOrDelayed(async () => {
                const reply = await self.sendRestRequest("PATCH",`https://discord.com/api/channels/${board.message.channel.id}/messages/${board.message.id}`, {
                    "embed": self.getEmbed(board)
                });
                const rateRemaining = reply.headers['x-ratelimit-remaining'];
                const ratesResetTime = reply.headers['x-ratelimit-reset'];
                if (ratesResetTime != undefined && rateRemaining != undefined) {
                    board.rateLimiter.insertRates(Number(ratesResetTime), Number(rateRemaining));
                }
                
                // If we were rate limited, try again
                if (reply.status == 429) {
                    console.log("Unexpected rate limit");
                    recursiveFunction(triesLeft);
                }
            });
        }
    }

    private async sendRestRequest(method: Method, url: string, data: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        const requestConfig: AxiosRequestConfig = {
            method,
            url,
            data,
            validateStatus: (_) => true,
            ...config,
            headers: {
                'content-type': 'application/json',
                Authorization: "Bot " + this.token,
                ...config?.headers
            }
        }

        return axios.request(requestConfig)
    }
}