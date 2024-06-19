using Discord.Net;
using Microsoft.AspNetCore.Mvc;
using MinesweeperDiscordBot.Boards;
using System.Text;

namespace MinesweeperDiscordBot;

public class BoardApi {
    private readonly BoardLibrary _boards;

    public BoardApi(BoardLibrary boards) {
        _boards = boards;
    }

    public void AddApis(WebApplication app) {
        var autocloseTemplate = File.ReadAllText("./Pages/AutoClose.html");

        IResult EncodePage(string newText) {
            return Results.Text(
                Encoding.UTF8.GetBytes(autocloseTemplate.Replace("{INSERT_TEXT_HERE}", newText)
            ), contentType: "text/html");
        }

        var clickedCell = EncodePage("Beep boop you clicked a cell. This window should close automatically, so hopefully you don't see this.");
        var setFlagging = EncodePage("Beep boop you're now flagging. This window should close automatically, so hopefully you don't see this.");
        var removeFlagging = EncodePage("Beep boop you're no longer flagging. This window should close automatically, so hopefully you don't see this.");

        var unknownPage = Results.Text(File.ReadAllBytes("./Pages/Unknown.html"), "text/html");

        app.MapGet("/set-flagging/{boardId}", ([FromRoute] ushort boardId, HttpContext context) => {
            context.Response.Cookies.Append(GetFlaggingCookie(boardId), "true", new() {
                Expires = DateTimeOffset.UtcNow.AddMinutes(15)
            });
            return setFlagging;
        });

        app.MapGet("/remove-flagging/{boardId}", ([FromRoute] ushort boardId, HttpContext context) => {
            context.Response.Cookies.Delete(GetFlaggingCookie(boardId));
            return removeFlagging;
        });

        app.MapGet("/{data}", ([FromRoute] string data, HttpContext context) => {
            var (boardId, x, y) = UrlSerializer.Deserialize(data);
            if (_boards.TryGetBoard(boardId, out var board) == false) {
                return unknownPage;
            }

            if (x < 0 || y < 0 || x >= board.Width || y >= board.Height) {
                return unknownPage;
            }

            bool isFlagging = context.Request.Cookies.TryGetValue(GetFlaggingCookie(boardId), out _);

            board.Click(new(x, y), isFlagging);
            return clickedCell;
        });
    }

    private string GetFlaggingCookie(ushort boardId) {
        return $"{boardId}_flagging";
    }
}
