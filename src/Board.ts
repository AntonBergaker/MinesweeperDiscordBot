export {Board, Cell}
import Discord = require("discord.js");
import * as utils from "./utils";

class Board {
    
    private board : Cell[][];
    private minesLeft : number;
    private placedMines : boolean;
    private blewUp : boolean;
    private won : boolean;
    private leftToClear : number;

    private width : number;
    private height : number;
    private totalMines : number;
    private id : number;

    get ID() : number {
        return this.id;
    }

    get GameOver() : boolean {
        return this.blewUp || this.won;
    }

    public message : Discord.Message;

    constructor(width : number, height : number, mines : number) {
        
        this.width = width;
        this.height = height;
        this.totalMines = mines;

        this.placedMines = false;
        this.blewUp = false;
        this.won = false;

        this.board = new Array<Array<Cell>>(width);
        for (let x=0;x<width;x++) {
            this.board[x] = new Array<Cell>(height);
            for (let y=0; y<height;y++) {
                this.board[x][y] = new Cell();
            }
        }
        this.minesLeft = mines;
        this.leftToClear = width*height - mines;
    }

    public setID(id : number) {
        this.id = id;
        this.setCellUrls();
    }

    private setCellUrls() {
        for (let x=0;x<this.width;x++) {
            for (let y=0; y<this.height;y++) {
                const bitMask = this.id << 8 | y << 4 | x;
                const buffer = Buffer.alloc(3);
                buffer[0] = ((bitMask & 0xFF0000) >> 16);
                buffer[1] = ((bitMask & 0x00FF00) >> 8);
                buffer[2] = ((bitMask & 0x0000FF) >> 0);

                this.board[x][y].url = buffer.toString('base64');
            }
        }
    }

    private clearNearby(x : number, y : number) {
        const x0 = utils.clamp(x-1, 0, this.width-1);
        const y0 = utils.clamp(y-1, 0, this.height-1);
        const x1 = utils.clamp(x+1, 0, this.width-1);
        const y1 = utils.clamp(y+1, 0, this.height-1);
        
        let count = 0;
        const toClear : [number, number][] = [];

        for (let xx = x0; xx <= x1; xx++) {
            for (let yy = y0; yy <= y1; yy++) {
                if (x == xx && y == yy) {
                    continue;
                }

                const cell = this.board[xx][yy];

                if (cell.markedForClearing) {
                    continue;
                }

                this.board[xx][yy].markedForClearing = true;
                toClear.push([xx, yy]);
            }
        }

        toClear.forEach(cell => {
            const [xx, yy] = cell;
            this.clear(xx, yy);
        });

        return count;
    }

    public clear(x : number, y : number) {
        if (this.placedMines == false) {
            this.placedMines = true;
            this.placeMines(this.minesLeft, x, y);
            this.calculateNear();
        }

        const cell = this.board[x][y];
        if (cell.mine) {
            this.blewUp = true;
            cell.blewUp = true;
        } else {
            this.leftToClear--;

            if (this.leftToClear == 0) {
                this.won = true;
            }
        }

        cell.cleared = true;
        cell.markedForClearing = true;

        if (cell.mine == false && cell.nearby == 0) {
            this.clearNearby(x, y);
        }
    }

    private randomInt(max : number) : number {
        return Math.floor(Math.random() * max);
    }

    private placeMines(minesToPlace : number, excludeX : number, excludeY : number) {
        let tries = 0;
        while (minesToPlace > 0) {
            const x = this.randomInt(this.width);
            const y = this.randomInt(this.height);

            console.log(x);

            if (x == excludeX && y == excludeY) {
                continue;
            }

            if (this.board[x][y].mine == false) {
                this.board[x][y].mine = true;
                minesToPlace--;
                continue;
            }

            tries++;
            if (tries > 100000) {
                break;
            }
        }


    }

    private getNearCell(x : number, y : number) : number {
        const x0 = utils.clamp(x-1, 0, this.width-1);
        const y0 = utils.clamp(y-1, 0, this.height-1);
        const x1 = utils.clamp(x+1, 0, this.width-1);
        const y1 = utils.clamp(y+1, 0, this.height-1);
        
        let count = 0;

        for (let xx = x0; xx <= x1; xx++) {
            for (let yy = y0; yy <= y1; yy++) {
                if (x == xx && y == yy) {
                    continue;
                }
                if (this.board[xx][yy].mine) {
                    count++
                }
            }
        }

        return count;
    }

    private calculateNear() {
        for (let x=0;x<this.width;x++) {
            for (let y=0; y<this.height;y++) {
                this.board[x][y].nearby = this.getNearCell(x, y);
            }
        }
    }

    static numbers = ["◼️", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"]

    public print(url : string) : string {
        let message = "";
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.board[x][y];
                if (cell.blewUp && cell.mine) {
                    message += "💥";
                    continue;
                }

                if (this.blewUp && cell.mine) {
                    message += "💣";
                    continue;
                }

                if (this.GameOver && cell.cleared == false) {
                    message += `◻️`;
                    continue;
                }

                if (cell.cleared == false) {
                    message += `[◻️](${url}/${cell.url})`;
                    continue;
                }

                message += Board.numbers[cell.nearby];
            }

            message += "\n";
        }

        return message;
    }

    public printLeft() : string {
        if (this.blewUp) {
            return "💣 You blew up! 💥";
        }
        
        if (this.won) {
            return "🎉🎉 You win! 🎉🎉";
        }

        return "Remaining: " + this.leftToClear;
    }
}

class Cell {
    public mine : boolean
    public blewUp : boolean
    public nearby : number
    public cleared : boolean
    public markedForClearing : boolean;
    public url : string;

    constructor() {
        this.mine = false;
        this.blewUp = false;
        this.nearby = 0;
        this.cleared = false;
        this.markedForClearing = false;
        this.url = "";
    }
}