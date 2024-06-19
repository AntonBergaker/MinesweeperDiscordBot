using Discord;
using Discord.WebSocket;
using MinesweeperDiscordBot.Boards;
using System.Text;

namespace MinesweeperDiscordBot;

public class DiscordBoard {
    private readonly Board _board;
    private readonly string _baseUrl;
    private readonly ushort _boardId;
    private readonly SocketSlashCommand _originalCommand;
    private readonly DiscordCell[,] _cells;
    private BoardCharacterCollection _activeCharacters;

    public delegate void GameOverEvent();
    public event GameOverEvent? GameOver;

    public record BoardCharacterCollection(string Block, string Flag, string WrongFlag, string Bomb, string ExplodedBomb, string[] Cleared);

    private readonly static BoardCharacterCollection EmojiCharacters = new(
        "◻️", "🚩", "🏳", "💣", "💥", ["◼️", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"]);

    private readonly static BoardCharacterCollection MonoWidthCharacters = new(
        "＃", "｜", "／", "ｏ", "＠", ["　", "１", "２", "３", "４", "５", "６", "７", "８"]);

    public DiscordBoard(Board board, string baseUrl, ushort boardId, SocketSlashCommand originalCommand) {
        _board = board;
        _originalCommand = originalCommand;
        _cells = new DiscordCell[_board.Width, _board.Height];
        _baseUrl = baseUrl;
        _boardId = boardId;
        _activeCharacters = EmojiCharacters;
        for (int x = 0; x < _board.Width; x++) {
            for (int y = 0; y < _board.Height; y++) {
                _cells[x, y] = new(_board[new(x, y)], $"{_baseUrl}/{UrlSerializer.Serialize(boardId, x, y)}");
            }
        }
    }

    private string? _jumpUrl;

    public async Task SetEmojiCharacters() {
        _activeCharacters = EmojiCharacters;

        await _originalCommand.ModifyOriginalResponseAsync(message => {
            message.Components = GetComponent();
            message.Embed = GetBoardEmbed();
        });
    }
    public async Task SetMonoWidthCharacters() {
        _activeCharacters = MonoWidthCharacters;

        await _originalCommand.ModifyOriginalResponseAsync(message => {
            message.Components = GetComponent();
            message.Embed = GetBoardEmbed();
        });
    }

    public async Task<string> GetLinkToMessage() {
        if (_jumpUrl != null ) {
            return _jumpUrl;
        }

        var message = await _originalCommand.GetOriginalResponseAsync();
        _jumpUrl = $"https://discord.com/channels/{_originalCommand.GuildId}/{_originalCommand.ChannelId}/{message.Id}";
        return _jumpUrl;
    }

    private string PrintBoardCells() {
        var sb = new StringBuilder();
        int linkCount = 0;
        for (var y = 0; y < _board.Height; y++) {
            for (var x = 0; x < _board.Width; x++) {
                var cellString = _cells[x, y].GetCellString(_board.State, _activeCharacters, ref linkCount);
                // Discord will trim whitespace, so if the top row is a whitespace make it a dot.
                if (x == 0 && y == 0 && string.IsNullOrWhiteSpace(cellString)) {
                    cellString = "．";
                } 
                sb.Append(cellString);
            }
            sb.Append('\n');
        }
        return sb.ToString();
    }

    private string PrintBoardTag() {
        return _board.State switch {
            BoardState.Won => "🎉🎉 You win! 🎉🎉",
            BoardState.Lost => "💣 You blew up! 💥",
            BoardState.Playing => $"{_board.LeftToClear}◻️   {_board.LeftToFlag}💣",
            _ => throw new NotImplementedException(),
        };
    }

    private Embed GetBoardEmbed() {
        var description = PrintBoardCells();
        if (description.Length > 4096) {
            description = description[0..4093] + "...";
        }
        if (description.Length < 3950 && _board.StartTime != null) {
            if (_board.State == BoardState.Playing) {
                description += $"\nStarted <t:{_board.StartTime.Value.ToUnixTimeMilliseconds() / 1000}:R>";
            }
            if (_board.State is BoardState.Won or BoardState.Lost) {
                var seconds = (DateTimeOffset.UtcNow - _board.StartTime.Value).TotalSeconds;
                description += $"\n{(_board.State == BoardState.Won ? "Won":"Lost")} in {seconds:.#} seconds!";
            }
        }

        var embed = new EmbedBuilder()
            .WithTitle(PrintBoardTag())
            .WithDescription(description)
            .WithColor(0x4EAF51)
            .WithFooter("Made by Anton Bergåker");

        return embed.Build();
    }

    private MessageComponent GetComponent() {
        var builder = new ComponentBuilder()
            .WithButton(
                label: "Flag",
                style: ButtonStyle.Link,
                url: $"{_baseUrl}/set-flagging/{_boardId}",
                emote: Emoji.Parse("🚩")
            )
            .WithButton(
                label: "Clear",
                style: ButtonStyle.Link,
                url: $"{_baseUrl}/remove-flagging/{_boardId}",
                emote: Emoji.Parse("◻️")
            );

        if (_activeCharacters == EmojiCharacters) {
            builder.WithButton(
                label: "Mobile Friendly (everyone)",
                style: ButtonStyle.Primary,
                customId: $"{_boardId}_mobile",
                emote: Emoji.Parse("📱"),
                row: 1
            );
        } else {
            builder.WithButton(
                label: "Emoji (everyone)",
                style: ButtonStyle.Primary,
                customId: $"{_boardId}_emoji",
                emote: Emoji.Parse("🎉"),
                row: 1
            );
        }

        return builder.Build();
    }

    private bool _hasReportedGameOver = false;
    public async Task Respond() {
        await _originalCommand.RespondAsync(embed: GetBoardEmbed(), components: GetComponent());
        _board.BoardChanged += async () => {

            if (_board.State != BoardState.Playing && _hasReportedGameOver == false) {
                GameOver?.Invoke();
                _hasReportedGameOver = true;

                var modifyResult = await _originalCommand.ModifyOriginalResponseAsync(message => {
                    message.Embed = GetBoardEmbed();
                    message.Components = new ComponentBuilder().Build();
                });
            } else {

                var modifyResult = await _originalCommand.ModifyOriginalResponseAsync(message => {
                    message.Embed = GetBoardEmbed();
                });

            }
        };
    }
}

public class DiscordCell {
    private readonly ICell _cell;
    private readonly string _url;

    public DiscordCell(ICell cell, string url) {
        _cell = cell;
        _url = url;
    }

    private string GetCellSymbol(BoardState state, DiscordBoard.BoardCharacterCollection characters) {
        if (state == BoardState.Lost && _cell.State == CellState.Flagged && _cell.IsMine == false) {
            return characters.WrongFlag;
        }
        if (_cell.State == CellState.Flagged) {
            return characters.Flag;
        }
        if (_cell.State == CellState.BlewUp) {
            return characters.ExplodedBomb;
        }
        if (state == BoardState.Lost && _cell.IsMine) {
            return characters.Bomb;
        }
        if (_cell.State == CellState.Normal) {
            return characters.Block;
        }
        return characters.Cleared[_cell.NearMinesCount];
    }

    public string GetCellString(BoardState state, DiscordBoard.BoardCharacterCollection characters, ref int linkCount) {
        if (state == BoardState.Playing && linkCount < 99) {
            if (_cell.State != CellState.Cleared || _cell.NearMinesCount > 0) {
                linkCount++;
                return $"[{GetCellSymbol(state, characters)}]({_url})";
            }
        }
        return GetCellSymbol(state, characters);
    }

}