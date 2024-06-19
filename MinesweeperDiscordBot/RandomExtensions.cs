namespace MinesweeperDiscordBot;

public static class RandomExtensions {
    public static Point NextPoint(this Random random, int maxX, int maxY) {
        return new(
            random.Next(maxX),
            random.Next(maxY)
        );
    }
}
