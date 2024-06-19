namespace MinesweeperDiscordBot.Boards;

public enum CellState {
    Normal,
    Cleared,
    Flagged,
    BlewUp
}

public interface ICell {
    bool IsMine { get; }
    int NearMinesCount { get; }
    CellState State { get; }
}