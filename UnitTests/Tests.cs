using MinesweeperDiscordBot;

namespace UnitTests;

public class Tests {

    [Test]
    public void Serializer() {
        var rng = new Random();
        for (int i = 0; i < 10 ; i++) {
            ushort id = (ushort)rng.Next(0, ushort.MaxValue);
            int x = rng.Next(0, 16);
            int y = rng.Next(0, 16);

            var serialized = UrlSerializer.Serialize(id, x, y);
            var result = UrlSerializer.Deserialize(serialized);
            Assert.AreEqual(id, result.id);
            Assert.AreEqual(x, result.x);
            Assert.AreEqual(y, result.y);
        }
    }
}