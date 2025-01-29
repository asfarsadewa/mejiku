export type Cell = {
  value: number | null;
  isFixed: boolean;
};

export type Grid = Cell[][];

export type Difficulty = "easy" | "medium" | "hard";

export type GameState = {
  grid: Grid;
  difficulty: Difficulty;
  selectedCell: [number, number] | null;
  isComplete: boolean;
}; 