using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;

namespace MinesweeperDiscordBot.Boards;

public class BoardLibrary {
    private readonly ConcurrentDictionary<ushort, Board> _boards;

    public BoardLibrary() {
        _boards = new();
    }

    public bool TryGetBoard(ushort boardId, [MaybeNullWhen(false)] out Board board) {
        return _boards.TryGetValue(boardId, out board);
    }

    public bool TryAddBoard(Board board, out ushort id) {
        var rng = Random.Shared;

        bool success = false;
        ushort newKey = 0;

        int i = 0;
        do {
            if (i++ > 1000) {
                break;
            }
            newKey = (ushort)rng.Next(0, ushort.MaxValue);
            success = _boards.TryAdd(newKey, board);
        } while (success == false);

        if (success == false) {
            id = default;
            return false;
        }

        id = newKey;
        return true;
    }

    public bool DeleteBoard(ushort board) {
        return _boards.TryRemove(board, out _);
    }
}
