namespace MinesweeperDiscordBot;

public struct Point {
    public int X;
    public int Y;

    public Point(int x, int y) {
        this.X = x;
        this.Y = y;
    }

    public static Point operator +(Point a, Point b) {
        return new(a.X + b.X, a.Y + b.Y);
    }

    public static Point operator -(Point a, Point b) {
        return new(a.X - b.X, a.Y - b.Y);
    }

    public static bool operator ==(Point a, Point b) {
        return a.X == b.X && a.Y == b.Y;
    }

    public static bool operator !=(Point a, Point b) {
        return a.X != b.X || a.Y != b.Y;
    }

    public override readonly string ToString() {
        return $"{X},{Y}";
    }

    public override readonly bool Equals(object? obj) {
        if (obj is not Point point) {
            return false;
        }
        return this == point;
    }

    public override int GetHashCode() {
        return HashCode.Combine(X, Y);
    }

}
