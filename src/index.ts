import * as process from "node:process";

export enum BlockType {
    MINE,
    NUMBER,
    EMPTY
}

export enum BlockState {
    REVEALED,
    FLAGGED,
    HIDDEN
}

export class Block {
    private readonly type: BlockType;
    private state: BlockState;
    private readonly value: number;

    public static createMineBlock() {
        return new Block(BlockType.MINE, 0);
    }

    public static createEmptyBlock() {
        return new Block(BlockType.EMPTY, 0);
    }

    public static createNumberBlock(value: number) {
        return new Block(BlockType.NUMBER, value);
    }

    constructor(type: BlockType, value: number) {
        this.type = type;
        this.state = BlockState.HIDDEN;
        this.value = value;
    }

    getType() {
        return this.type;
    }

    getState() {
        return this.state;
    }

    getValue() {
        return this.value;
    }

    setState(state: BlockState) {
        this.state = state;
    }
}

export class GameOver extends Error {
    constructor() {
        super("Game Over");
    }
}

export class Board {
    private readonly blocks: Block[][];
    private revealedBlocks: number = 0;
    private readonly totalBlocks: number;

    getTotalBlocks() {
        return this.totalBlocks;
    }

    getRevealedBlocks() {
        return this.revealedBlocks;
    }

    public static createBoard(width: number, height: number, mines: number) {
        if (width !== height)
            throw new Error("Width and height must be equal");
        const blocks: Block[][] = []
        let minesLeft = mines;
        for (let i = 0; i < width; i++) {
            blocks.push([]);
            for (let j = 0; j < height; j++) {
                const isMine = Math.random() < minesLeft / (width * height);

                if (isMine) {
                    minesLeft--;
                    blocks[i].push(Block.createMineBlock());
                    continue
                }

                blocks[i].push(Block.createEmptyBlock());
            }
        }

        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                if (blocks[i][j].getType() === BlockType.MINE)
                    continue;

                let value = 0;

                for (let x = i - 1; x <= i + 1; x++) {
                    for (let y = j - 1; y <= j + 1; y++) {
                        if (x < 0 || y < 0 || x >= width || y >= height)
                            continue;

                        if (blocks[x][y].getType() === BlockType.MINE)
                            value++;
                    }
                }

                blocks[i][j] = Block.createNumberBlock(value);
            }
        }

        return new Board(blocks);
    }

    constructor(blocks: Block[][]) {
        this.blocks = blocks;
        this.totalBlocks = blocks.length * blocks[0].length;
    }

    getBlocks() {
        return this.blocks;
    }

    private getBlock(x: number, y: number) {
        return this.blocks[x][y];
    }

    flagBlock(x: number, y: number) {
        const block = this.getBlock(x, y);

        if (block.getState() === BlockState.HIDDEN)
            block.setState(BlockState.FLAGGED);
        else if (block.getState() === BlockState.FLAGGED)
            block.setState(BlockState.HIDDEN);

        return
    }

    revealBlock(x: number, y: number) {
        const block = this.getBlock(x, y);

        if (block.getState() !== BlockState.HIDDEN)
            return;

        block.setState(BlockState.REVEALED);

        if (block.getType() === BlockType.NUMBER)
            return

        if (block.getType() === BlockType.MINE) {
            this.revelAllMines();
            throw new GameOver()
        }

        this.revealedBlocks++;


        if (block.getType() === BlockType.EMPTY) {
            this.revealedBlocks++;
            this.revealAdjacentBlocks(x, y);
        }
    }

    private revealAdjacentBlocks(x: number, y: number) {
        for (let i = x - 1; i <= x + 1; i++) {
            for (let j = y - 1; j <= y + 1; j++) {
                if (i < 0 || j < 0 || i >= this.blocks.length || j >= this.blocks[0].length)
                    continue;

                if (i === x && j === y)
                    continue;

                this.revealBlock(i, j);
            }
        }
    }

    revelAllMines() {
        this.blocks.forEach(row => {
            row.forEach(block => {
                if (block.getType() === BlockType.MINE)
                    block.setState(BlockState.REVEALED);
            });
        });
    }
}

export enum Difficulty {
    EASY,
    MEDIUM,
    HARD
}

export enum GameState {
    PLAYING,
    WON,
    LOST
}

export type GameConfig = {
    difficulty: Difficulty,
    modes: {
        [key in Difficulty]: {
            width: number,
            height: number,
            mines: number
        }
    }
}

export const baseConfig: GameConfig = {
    difficulty: Difficulty.EASY,
    modes: {
        [Difficulty.EASY]: {
            width: 9,
            height: 9,
            mines: 10
        },
        [Difficulty.MEDIUM]: {
            width: 16,
            height: 16,
            mines: 40
        },
        [Difficulty.HARD]: {
            width: 30,
            height: 16,
            mines: 99
        }
    }
}

export class GameManager {
    private readonly gameConfig: GameConfig;
    private readonly board: Board;
    private gameState: GameState;


    private initBoard() {
        switch (this.gameConfig.difficulty) {
            case Difficulty.EASY:
                return Board.createBoard(this.gameConfig.modes[Difficulty.EASY].width, this.gameConfig.modes[Difficulty.EASY].height, this.gameConfig.modes[Difficulty.EASY].mines);
            case Difficulty.MEDIUM:
                return Board.createBoard(this.gameConfig.modes[Difficulty.MEDIUM].width, this.gameConfig.modes[Difficulty.MEDIUM].height, this.gameConfig.modes[Difficulty.MEDIUM].mines);
            case Difficulty.HARD:
                return Board.createBoard(this.gameConfig.modes[Difficulty.HARD].width, this.gameConfig.modes[Difficulty.HARD].height, this.gameConfig.modes[Difficulty.HARD].mines);
        }
    }

    constructor(gameConfig: GameConfig) {
        this.gameConfig = gameConfig;
        this.board = this.initBoard();
        this.gameState = GameState.PLAYING;
    }

    getBoard() {
        return this.board;
    }

    getGameState() {
        return this.gameState;
    }

    flagBlock(x: number, y: number) {
        if (this.gameState !== GameState.PLAYING)
            return;

        this.board.flagBlock(x, y);
    }

    revealBlock(x: number, y: number) {
        if (this.gameState !== GameState.PLAYING)
            return;

        try {
            this.board.revealBlock(x, y);

            const totalRevealableBlocks = this.board.getTotalBlocks() - this.gameConfig.modes[this.gameConfig.difficulty].mines;

            if (this.board.getRevealedBlocks() === totalRevealableBlocks)
                this.gameState = GameState.WON;
        } catch (e: unknown) {
            if (!(e instanceof GameOver))
                throw e
            this.gameState = GameState.LOST;
        }
    }
}

const gameManager = new GameManager(baseConfig);

const blocks = gameManager.getBoard().getBlocks()
for (let i = 0; i < blocks.length; i++) {
    process.stdout.write("\n");
    for (let j = 0; j < blocks[0].length; j++) {
        const block = blocks[i][j];
        switch (block.getType()) {
            case BlockType.MINE:
                process.stdout.write(" M ");
                break;
            case BlockType.NUMBER:
                process.stdout.write(` ${block.getValue().toString()} `);
                break;
            case BlockType.EMPTY:
                process.stdout.write("   ");
                break;
        }
    }
}

gameManager.revealBlock(0, 0);

if (gameManager.getGameState() === GameState.LOST)
    process.stdout.write("\nGame Over");

process.stdout.write("\n");
