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
    private _id : number;

    private timeStarted : number;
    private timeEnded : number;
    private _boardStarterId: string;

    get id() : number {
        return this._id;
    }

    get gameOver() : boolean {
        return this.blewUp || this.won;
    }

    get boardStarterId(): string {
        return this._boardStarterId;
    }

    public message : Discord.Message;

    constructor(width : number, height : number, mines : number, boardId:number, boardStarterId: string) {
        this._id = boardId;
        this.width = width;
        this.height = height;
        this.totalMines = mines;

        this.placedMines = false;
        this.blewUp = false;
        this.won = false;

        this._boardStarterId = boardStarterId;

        this.board = new Array<Array<Cell>>(width);
        for (let x=0;x<width;x++) {
            this.board[x] = new Array<Cell>(height);
            for (let y=0; y<height;y++) {
                this.board[x][y] = new Cell();
            }
        }
        this.minesLeft = mines;
        this.leftToClear = width*height - mines;
        this.setCellUrls();
    }

    private setCellUrls() {
        for (let x=0;x<this.width;x++) {
            for (let y=0; y<this.height;y++) {
                const bitMask = this._id << 8 | y << 4 | x;
                const buffer = Buffer.alloc(3);
                buffer[0] = ((bitMask & 0xFF0000) >> 16);
                buffer[1] = ((bitMask & 0x00FF00) >> 8);
                buffer[2] = ((bitMask & 0x0000FF) >> 0);

                this.board[x][y].url = buffer.toString('base64');
            }
        }
    }

    private clearNearby(x : number, y : number) {
        let count = 0;
        const toClear : [number, number][] = [];

        this.foreachNearbyCell(x, y, (cell, xx, yy) => {
            if (cell.markedForClearing) {
                return;
            }

            cell.markedForClearing = true;
            toClear.push([xx, yy]);
        });

        toClear.forEach(cell => {
            const [xx, yy] = cell;
            if (this.board[xx][yy].flagged) {
                this.board[xx][yy].flagged = false;
            }
            this.clear(xx, yy);
        });

        return count;
    }

    public clear(x : number, y : number): boolean {
        if (this.placedMines == false) {
            this.placedMines = true;
            this.timeStarted = Date.now();
            this.placeMines(this.minesLeft, x, y);
            this.calculateNear();
        }

        const cell = this.board[x][y];
        if (cell.cleared) {
            return false;
        }
        if (cell.flagged) {
            return false;
        }
        if (cell.mine) {
            this.blewUp = true;
            this.timeEnded = Date.now();
            cell.blewUp = true;
        } else {
            this.leftToClear--;

            if (this.leftToClear == 0) {
                this.won = true;
                this.timeEnded = Date.now();
            }
        }

        cell.cleared = true;
        cell.markedForClearing = true;

        if (cell.mine == false && cell.nearby == 0) {
            this.clearNearby(x, y);
        }
        return true;
    }

    public flag(x: number, y: number): boolean {
        const cell = this.board[x][y];

        if (cell.cleared) {
            return false;
        }

        cell.flagged = !cell.flagged;
        return true;
    }

    public chord(x: number, y: number): boolean {
        const cell = this.board[x][y];
        if (cell.cleared == false) {
            return false;
        }
        if (cell.nearby == 0) {
            return false;
        }
        if (cell.nearby != this.flagCountAroundCell(x, y)) {
            return false;
        }

        this.foreachNearbyCell(x, y, (cell, xx, yy) => {
            if (cell.flagged) {
                return;
            }
            this.clear(xx, yy);
        });

        return true;
    }

    public click(x: number, y: number, isFlagging: boolean): boolean {
        const cell = this.board[x][y];
        if (cell.cleared) {
            return this.chord(x, y);
        } else if (isFlagging) {
            return this.flag(x, y);
        } else {
            return this.clear(x, y);
        }
    }

    private flagCountAroundCell(x: number, y: number): number {
        let flagCount = 0;
        this.foreachNearbyCell(x, y, cell => {
            if (cell.flagged) {
                flagCount++;
            }
        });
        return flagCount;
    }

    private randomInt(max : number) : number {
        return Math.floor(Math.random() * max);
    }

    private placeMines(minesToPlace : number, excludeX : number, excludeY : number) {
        // Do the fast method if the amount of mines is "normal", otherwise do the constant time slow one
        const expectedMineCountPerCell = minesToPlace/Math.max(0, this.width*this.height - 9);
        const giveBigSafeSpot = this.width >= 5 && this.height >= 5;
        const safeDistance = giveBigSafeSpot ? 1 : 0;

        if (expectedMineCountPerCell > 0.6) {
            // Slow but safe method. Make a list of all available places, put it in an list, shuffle the list and pop until we placed all.
            const cells: [number, number][] = [];
            const backupCells: [number, number][] = [];
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    // Don't place mines in the 3x3 area around start
                    if (Math.abs(x - excludeX) <= safeDistance && Math.abs(y - excludeY) <= safeDistance) {
                        if (x != excludeX || y != excludeY) {
                            backupCells.push([x, y]);
                        }
                        continue;
                    }
                    cells.push([x, y]);
                }
            }

            utils.shuffleArray(cells);
            utils.shuffleArray(backupCells);

            const allCells = cells.concat(backupCells);

            for (let i = 0;i < minesToPlace; i++) {
                if (allCells.length == 0) {
                    break;
                }
                const [x, y] = allCells.pop();
                this.board[x][y].mine = true;
            }
        }
        else {
            // Fast but bad worse case. Keep picking random spots until we placed all mines
            for (let i = 0; i < 10000; i++) {
                if (minesToPlace <= 0) {
                    break;
                }

                const x = this.randomInt(this.width);
                const y = this.randomInt(this.height);

                // Don't place mines in the 3x3 area around start
                if (Math.abs(x - excludeX) <= safeDistance && Math.abs(y - excludeY) <= safeDistance) {
                    continue;
                }

                if (this.board[x][y].mine == false) {
                    this.board[x][y].mine = true;
                    minesToPlace--;
                    continue;
                }
            }
        }
    }

    private getNearCell(x : number, y : number) : number {        
        let count = 0;

        this.foreachNearbyCell(x, y, cell => {
            if (cell.mine) {
                count++
            }
        });

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
                if (cell.flagged && this.blewUp && !cell.mine) {
                    message += "🏳";
                    continue;
                }
                if (cell.flagged && this.gameOver) {
                    message += "🚩";
                    continue;
                }
                if (cell.flagged) {
                    message += `[🚩](${url}/${cell.url})`;
                    continue;
                }
                if (cell.blewUp && cell.mine) {
                    message += "💥";
                    continue;
                }
                if (this.blewUp && cell.mine) {
                    message += "💣";
                    continue;
                }
                if (this.gameOver && cell.cleared == false) {
                    message += `◻️`;
                    continue;
                }
                if (cell.cleared == false) {
                    message += `[◻️](${url}/${cell.url})`;
                    continue;
                }
                if (cell.nearby != 0 && !this.gameOver) {
                    message += `[${Board.numbers[cell.nearby]}](${url}/${cell.url})`;
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

    public printMode(url: string): string {
        return `Set click action: [🚩](${url}/set-flagging/${this.id}) / [◻️](${url}/remove-flagging/${this.id})`;
    }

    public getElapsedSeconds(): number {
        if (this.gameOver) {
            return this.timeEnded - this.timeStarted;
        } else {
            return Date.now() - this.timeStarted;
        }
    }

    private foreachNearbyCell(x: number, y: number, func: (cell: Cell, x?: number, y?: number) => void ): void {
        const x0 = utils.clamp(x-1, 0, this.width-1);
        const y0 = utils.clamp(y-1, 0, this.height-1);
        const x1 = utils.clamp(x+1, 0, this.width-1);
        const y1 = utils.clamp(y+1, 0, this.height-1);

        for (let xx = x0; xx <= x1; xx++) {
            for (let yy = y0; yy <= y1; yy++) {
                if (xx == x && yy == y) {
                    continue;
                }
                func(this.board[xx][yy], xx, yy);
            }
        }
    }
}

class Cell {
    public mine : boolean;
    public blewUp : boolean;
    public nearby : number;
    public cleared : boolean;
    public flagged : boolean;
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