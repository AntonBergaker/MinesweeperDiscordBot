using Discord.WebSocket;
using Discord;
using MinesweeperDiscordBot.Boards;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace MinesweeperDiscordBot;

public class DiscordBot {
    private readonly string _token;
    private readonly string _url;
    private readonly DiscordSocketClient _client;
    private readonly ILogger _logger;
    private readonly BoardLibrary _boards;

    private readonly ConcurrentDictionary<ulong, DiscordBoard> _discordMessagesPerGuild;

    public DiscordBot(IConfiguration config, ILogger<DiscordBot> logger, BoardLibrary boards) {
        _client = new();
        _client.Log += Client_Log;
        _client.Ready += Client_Ready;
        _client.SlashCommandExecuted += Client_SlashCommandExecuted;
        _client.ButtonExecuted += Client_ButtonExecuted;

        _logger = logger;
        _boards = boards;
        _discordMessagesPerGuild = new();

        var discordSection = config.GetRequiredSection("Discord");
        _token = discordSection["Token"] ?? throw new Exception($"Token was not provided to {nameof(DiscordBot)}");

        var webSection = config.GetRequiredSection("Web");
        _url = webSection["Url"] ?? throw new Exception($"URL was not provided to {nameof(DiscordBot)}");
        _url = _url.TrimEnd('/').Trim();
    }

    private async Task Client_ButtonExecuted(SocketMessageComponent arg) {
        var data = arg.Data.CustomId;
        var parts = data.Split('_');
        if (parts.Length != 2 ) {
            await arg.DeferAsync();
            return;
        }
        if (_discordMessagesPerGuild.TryGetValue(arg.GuildId!.Value, out var board) == false) {
            await arg.DeferAsync();
            return;
        }

        if (parts[1] == "emoji") {
            await board.SetEmojiCharacters();
        } else {
            await board.SetMonoWidthCharacters();
        }

        await arg.DeferAsync();
    }

    private async Task Client_SlashCommandExecuted(SocketSlashCommand arg) {
        if (arg.CommandName != "minesweeper") {
            return;
        }

        if (arg.IsDMInteraction) {
            await arg.RespondAsync($"This command can only be called from inside a server.", ephemeral: true);
            return;
        }
        if (arg.GuildId == null) {
            await arg.RespondAsync($"Failed to figure out what server this is. This might be a sign of improper permissions.", ephemeral: true);
            return;
        }

        var guild = arg.GuildId.Value;
        if (_discordMessagesPerGuild.TryGetValue(guild, out var existingBoard)) {
            var link = await existingBoard.GetLinkToMessage();
            await arg.RespondAsync($"There is already a game on this server: {link}", ephemeral: true);
            return;
        }

        var options = arg.Data.Options.ToDictionary(x => x.Name, x => x.Value);

        int ReadOption(string key, int @default) {
            if (options.TryGetValue(key, out var valueObject) == false) {
                return @default;
            }
            if (valueObject is int @int) {
                return @int;
            }
            if (valueObject is double @double) {
                return (int)@double;
            }

            return @default;
        }

        int width = Math.Clamp(ReadOption("width", 10), 1 , 10);
        int height = Math.Clamp(ReadOption("height", 10), 1, 10);
        int mines = Math.Clamp(ReadOption("mines", width*height*17/100-2), 0, width * height - 1);

        var board = new Board(width, height, mines);
        if (_boards.TryAddBoard(board, out var boardId) == false) {
            await arg.RespondAsync("Failed to create a board. There might be too many boards in the wild right now.");
            return;
        }
        var discBoard = new DiscordBoard(board, _url, boardId, arg);
        _discordMessagesPerGuild.TryAdd(guild, discBoard);
        discBoard.GameOver += () => {
            // Remove the board on game over.
            _discordMessagesPerGuild.TryRemove(guild, out _);
        };
        try {
            await discBoard.Respond();
        } catch (Exception) {
            // Remove if errored
            _discordMessagesPerGuild.TryRemove(guild, out _);
        }
    }

    private async Task Client_Ready() {
        var startCommand = new SlashCommandBuilder()
            .WithName("minesweeper")
            .WithContextTypes(InteractionContextType.Guild)
            .AddOption(
                name: "mines",
                type: ApplicationCommandOptionType.Number,
                description: "The number of mines on the field",
                isRequired: false
            )
            .AddOption(
                name: "height",
                type: ApplicationCommandOptionType.Number,
                description: "The height of the field",
                isRequired: false
            )
            .AddOption(
                name: "width",
                type: ApplicationCommandOptionType.Number,
                description: "The width of the field",
                isRequired: false
            )
            .WithDescription("Start a new game of minesweeper in this channel.")
        .Build();
        
        try {
            await _client.CreateGlobalApplicationCommandAsync(startCommand);
        } catch (Exception ex) {
            _logger.LogError("Failed to create command, threw exception {ex}", ex.ToString());
        }
    }

    private Task Client_Log(LogMessage arg) {
        _logger.Log(arg.Severity switch {
            LogSeverity.Critical => LogLevel.Critical,
            LogSeverity.Error => LogLevel.Error,
            LogSeverity.Warning => LogLevel.Warning,
            LogSeverity.Info => LogLevel.Information,
            LogSeverity.Debug => LogLevel.Debug,
            LogSeverity.Verbose => LogLevel.Trace,
            _ => LogLevel.None
        }, "{Message}", arg.Message);
        return Task.CompletedTask;
    }

    public async Task Start() {
        await _client.LoginAsync(TokenType.Bot, _token);
        await _client.StartAsync();
    }
}
