using MinesweeperDiscordBot.Boards;

namespace MinesweeperDiscordBot;

public static class UrlSerializer {
    public static string Serialize(ushort id, int x, int y) {
        Span<byte> bytes = stackalloc byte[4];
        uint url = (uint)(id << 8 | x << 4 | y);
        BitConverter.TryWriteBytes(bytes, url);

        return Convert.ToBase64String(bytes[0..3]);
    }

    public static (ushort id, int x, int y) Deserialize(string @string) {
        Span<byte> bytes = stackalloc byte[4];
        Convert.TryFromBase64String(@string, bytes[0..3], out _);
        var url = BitConverter.ToUInt32(bytes);

        return ((ushort)(url >> 8), (int)((url >> 4) & 0xF), (int)(url & 0xF)); 
    }
}
