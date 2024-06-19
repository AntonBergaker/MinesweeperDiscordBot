using System.Runtime.InteropServices;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace MinesweeperDiscordBot.Boards;

public enum BoardState {
    Playing,
    Won,
    Lost,
}

public class Board {
    public class InternalCell : ICell {
        public bool IsMine { get; set; }
        public int NearMinesCount { get; set; }
        public CellState State { get; set; }
        public bool MarkedForClearing { get; set; }
    }


    private readonly InternalCell[,] _cells;

    private bool _hasPlacedMines = false;
    private int _mineCount;

    public int Width => _cells.GetLength(0);
    public int Height => _cells.GetLength(1);
    public ICell this[Point point] => _cells[point.X, point.Y];

    public BoardState State { get; private set; }
    public int LeftToClear { get; private set; }
    public int LeftToFlag { get; private set; }
    public DateTimeOffset? StartTime { get; private set; }

    public delegate void BoardChangedEvent();
    public event BoardChangedEvent? BoardChanged;

    public Board(int width, int height, int mineCount) {
        _cells = new InternalCell[width, height];
        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                _cells[x, y] = new InternalCell();
            }
        }

        _mineCount = mineCount;
        State = BoardState.Playing;
        LeftToFlag = mineCount;
        LeftToClear = width * height - mineCount;
    }

    public void Click(Point point, bool isFlagging) {
        var cell = this[point];
        bool changed;
        if (cell.State == CellState.Cleared) {
            changed = Chord(point);
        } else if (isFlagging) {
            changed = Flag(point);
        } else {
            changed = Clear(point);
        }

        if (changed) {
            BoardChanged?.Invoke();
        }
    }

    private bool Clear(Point point) {
        if (State != BoardState.Playing) {
            return false;
        }

        if (_hasPlacedMines == false) {
            PlaceMines(_mineCount, point);
        }
        var cell = GetCell(point);
        if (cell.State is CellState.Cleared or CellState.Flagged) {
            return false;
        }

        if (cell.IsMine) {
            State = BoardState.Lost;
            cell.State = CellState.BlewUp;
            return true;
        }

        cell.State = CellState.Cleared;
        cell.MarkedForClearing = true;

        if (cell.NearMinesCount == 0) {
            var cellsToClear = new List<Point>();
            foreach (var nearPoint in PointsNearCell(point)) {
                var near = GetCell(nearPoint);
                near.MarkedForClearing = true;
                cellsToClear.Add(nearPoint);
            }
            foreach (var cellToClear in cellsToClear) {
                Clear(cellToClear);
            }
        }

        LeftToClear--;
        if (LeftToClear <= 0) {
            State = BoardState.Won;
        }

        return true;
    }

    private bool Flag(Point point) {
        if (State != BoardState.Playing) {
            return false;
        }
        
        var cell = GetCell(point);
        if (cell.State is CellState.Cleared) { 
            return false; 
        }

        // Flip it
        if (cell.State == CellState.Flagged) {
            cell.State = CellState.Normal;
            LeftToFlag++;
        } else {
            cell.State = CellState.Flagged;
            LeftToFlag--;
        }
        return true;
    }

    private bool Chord(Point point) {
        if (State != BoardState.Playing) {
            return false;
        }

        var cell = GetCell(point);
        if (cell.State != CellState.Cleared) {
            return false;
        }

        var flaggedNearby = CellsNearCell(point).Where(x => x.State == CellState.Flagged).Count();
        var expectedNearby = cell.NearMinesCount;

        if (flaggedNearby != expectedNearby) {
            return false;
        }

        var cellsToClear = new List<Point>();
        foreach (var nearPoint in PointsNearCell(point)) {
            var near = GetCell(nearPoint);
            near.MarkedForClearing = true;
            cellsToClear.Add(nearPoint);
        }
        foreach (var cellToClear in cellsToClear) {
            Clear(cellToClear);
        }

        return true;
    }

    private InternalCell GetCell(Point point) {
        return _cells[point.X, point.Y];
    }

    private void PlaceMines(int mineCount, Point startPoint) {
        var random = new Random();

        int minesLeft = mineCount;

        // Do the fast method if the amount of mines is "normal", otherwise do the constant time slow one
        var expectedMineCountPerCell = minesLeft / Math.Max(0, Width * Height - 9);
        var giveBigSafeSpot = Width >= 5 && Height >= 5;
        var safeDistance = giveBigSafeSpot ? 1 : 0;

        LeftToFlag = 0;

        bool IsInsideSafe(Point point) {
            var diff = startPoint - point;
            return Math.Abs(diff.X) <= safeDistance && Math.Abs(diff.Y) <= safeDistance;
        }

        if (expectedMineCountPerCell > 0.6) {
            // Slow but safe method. Make a list of all available places, put it in an list, shuffle the list and pop until we placed all.
            var cells = new List<Point>();
            var backupCells = new List<Point>();

            for (int x = 0; x < Width; x++) {
                for (int y = 0; y < Height; y++) {
                    var point = new Point(x, y);
                    // Don't place mines in the 3x3 area around start
                    if (IsInsideSafe(point)) {
                        if (point != startPoint) {
                            backupCells.Add(new(x, y));
                        }
                        continue;
                    }
                    cells.Add(new(x, y));
                }
            }

            random.Shuffle(CollectionsMarshal.AsSpan(cells));
            random.Shuffle(CollectionsMarshal.AsSpan(backupCells));

            var allCells = cells.Concat(backupCells).Take(minesLeft);

            foreach (var p in allCells) {
                GetCell(p).IsMine = true;
                LeftToFlag++;
            }
        } else {
            // Fast but bad worse case. Keep picking random spots until we placed all mines
            for (var i = 0; i < 10000; i++) {
                if (minesLeft <= 0) {
                    break;
                }

                var point = random.NextPoint(Width, Height);

                // Don't place mines in the 3x3 area around start
                if (IsInsideSafe(point)) {
                    continue;
                }

                if (this[point].IsMine == false) {
                    GetCell(point).IsMine = true;
                    LeftToFlag++;
                    minesLeft--;
                    continue;
                }
            }
        }

        StartTime = DateTimeOffset.UtcNow;
        LeftToClear = Width * Height - LeftToFlag;
        _hasPlacedMines = true;
        CalculateNearMineNumbers();
    }

    private IEnumerable<InternalCell> CellsNearCell(Point startPoint) {
        return PointsNearCell(startPoint).Select(x => GetCell(x));
    }

    private IEnumerable<Point> PointsNearCell(Point startPoint) {
        var x0 = Math.Clamp(startPoint.X - 1, 0, Width - 1);
        var x1 = Math.Clamp(startPoint.X + 1, 0, Width - 1);
        var y0 = Math.Clamp(startPoint.Y - 1, 0, Height - 1);
        var y1 = Math.Clamp(startPoint.Y + 1, 0, Height - 1);

        for (var x = x0; x <= x1; x++) {
            for (var y = y0; y <= y1; y++) {
                var point = new Point(x, y);
                if (point == startPoint) {
                    continue;
                }
                yield return new Point(x, y);
            }
        }
    }

    private void CalculateNearMineNumbers() {
        int CalculateNearMinesForCell(Point point) {
            return CellsNearCell(point).Where(x => x.IsMine).Count();
        }

        for (int x = 0; x < Width; x++) {
            for (int y = 0; y < Height; y++) {
                var p = new Point(x, y);
                var near = CalculateNearMinesForCell(p);
                GetCell(p).NearMinesCount = near;
            }
        }
    }
}
