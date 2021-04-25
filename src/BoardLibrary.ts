export {BoardLibrary}

import {Board} from "./Board";

class BoardLibrary {

    private boardsByChannel : Map<string, Board>
    private boardsByID : Map<number, Board>

    constructor() {
        this.boardsByChannel = new Map<string, Board>();
        this.boardsByID = new Map<number, Board>();
    }

    public boardForChannel(channelID : string) : Board | undefined {
        return this.boardsByChannel.get(channelID);
    }

    public boardFromID(boardID : number) : Board | undefined {
        return this.boardsByID.get(boardID);
    }

    public removeBoard(boardID : number) {
        const board = this.boardFromID(boardID);
        if (board == undefined) {
            return;
        }
        this.boardsByChannel.delete(board.message.channel.id);
        this.boardsByID.delete(boardID);
    }

    public makeBoard(width : number, height : number, mines : number, channelID : string, boardStartedId: string) : Board {
        const board = new Board(width, height, mines, this.chooseBoardID(), boardStartedId);

        this.boardsByChannel.set(channelID, board);
        this.boardsByID.set(board.id, board);

        return board;
    }

    private chooseBoardID() : number {
        while (true) {
            const id = Math.floor(Math.random()*0xFFFF);
            if (this.boardsByID.has(id)) {
                continue;
            }
            return id;
        }
    }
}