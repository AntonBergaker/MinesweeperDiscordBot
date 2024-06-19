# MinesweeperDiscordBot

![Bot being played in real time](https://github.com/AntonBergaker/MinesweeperDiscordBot/blob/master/marketing/in-action.gif)

## What is this?
A Discord bot that allows you to play Minesweeper directly inside a channel.
It works on PC and mobile(althought not a great experience) and multiple users can play on the same board.
You can customize the size of the board and its mine count.
It has all features you'd expect, like flagging and more advanced features like [chording](http://www.minesweeper.info/wiki/Chord).

## How? 
Discord bots are allowed to create hyperlinks, links with a different text than destination.
Abusing this fact, we can create grids of cells where each cell takes us to a website that works out what cell we pressed based on the url.
However, url's are big and Discord limits each message to 4096 characters.
Luckily emoji count as one character and we can do some clever bit magic to compress as much info into as short urls as possible.
Currently it uses 4 characters encoded in base64, which gives us 3 bytes of information per link.
Boards are under 16 characters wide and tall, so one byte is enough to store both the x/y of the cell.
This leaves us with two bytes to identify the board, meaning it's possible to support 65536 simulationous games under the same domain.

These improvements actually puts us down far enough we hit another limit, Discord will starting hiding links once there's 100 of them in one message.
This is why the limit is set to 100 mines currently. Even with 100 mines one mine is not clickable because it starts hiding the 100th one.

It's possible to go between flagging and clearing cells, using the same url.
This is done with a dedicated url to set yourself to either flagging or clearing.
The url will set or remove a cookie that expires after 15 minutes which is then used by the server to determine what action to perform under each cell.
Sadly it's not possible to indicate in any way what mode you're currently using, which is a bit poor UX.

## Why?
Hmm.

## Possible improvements
- Currently, Discord's character limit is measured by amount of characters instead of amount of bytes.
This mean we can get more information from the same url length by using foreign characters.
I believe using some hacked together version of "base256" could either enable shorter urls(meaning larger game boards) or more dense ones, meaning more possible simultanous games.

- Almost all 4096 characters are consumed by links.
We can cut down on the amount of links by having the bot automatically clear the first cell, and after this only put links on cells one can reasonably have a reason to press.
Takes some work though, especially making sure we don't get stuck in "weird" situations where we do have to press out of the way cells.

- A shorter domain would be nice, but they're hard to get by. Currently using `uwuo.eu`.
