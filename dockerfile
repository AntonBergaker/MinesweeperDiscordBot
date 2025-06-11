# https://hub.docker.com/_/microsoft-dotnet
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /source

# copy csproj and restore as distinct layers
COPY MinesweeperDiscordBotCore.sln .
COPY MinesweeperDiscordBot/*.csproj ./MinesweeperDiscordBot/
RUN dotnet restore

# copy everything else and build app
COPY MinesweeperDiscordBot/. ./MinesweeperDiscordBot/
WORKDIR /source/MinesweeperDiscordBot
RUN dotnet publish -c release -o /app --no-restore

# final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app ./

EXPOSE 3001:3001

ENTRYPOINT ["dotnet", "MinesweeperDiscordBot.dll"]