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
However, url's are big and Discord limits each message to 2048 characters.
Luckily emoji count as one character and we can do some clever bit magic to compress as much info into as short urls as possible.

## Why?
Hmm.

## Possible improvements
- Currently, Discord's character limit is measured by amount of characters instead of amount of bytes.
This mean we can get more information from the same url length by using foreign characters.
I believe using some hacked together version of "base256" could either enable shorter urls(meaning larger game boards) or more dense ones, meaning more possible simultanous games.

- Almost all 2048 characters are consumed by links.
We can cut down on the amount of links by having the bot automatically clear the first cell, and after this only put links on cells one can reasonably have a reason to press.
Takes some work though, especially making sure we don't get stuck in "weird" situations where we do have to press out of the way cells.

- A shorter domain would be nice, but they're hard to get by. Currently using `uwuo.eu`.

## Running your own version
To begin, rename `config_sample.json` to `config.json`. Inside the config, fill out the following values:
* `identifier` - What word the bot responds to. By default this is minesweeper. You can also set it to an array of strings and it'll respond to each one.
* `token` - The discord bot token for your bot.
* `url` - The url the links should point at. A shorter url lets you have a bigger board.
* `port` - Port the webserver should listen to.
* `max_width` - The max and default board width.
* `max_height` - The max and default board height.
