using Discord.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using MinesweeperDiscordBot;
using MinesweeperDiscordBot.Boards;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.Services.AddSingleton<DiscordBot>();
builder.Services.AddSingleton<BoardLibrary>();

var app = builder.Build();

_ = app.Services.GetRequiredService<DiscordBot>().Start();

var api = new BoardApi(app.Services.GetRequiredService<BoardLibrary>());
api.AddApis(app);

app.Run();
