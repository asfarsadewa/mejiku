import type { Grid, Difficulty } from "@/types/game";

export function createEmptyGrid(): Grid {
  return Array(9).fill(null).map(() =>
    Array(9).fill(null).map(() => ({
      value: null,
      isFixed: false,
    }))
  );
}

function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (grid[row][x].value === num) return false;
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (grid[x][col].value === num) return false;
  }

  // Check 3x3 box
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[i + startRow][j + startCol].value === num) return false;
    }
  }

  return true;
}

// Helper function to find an empty cell
function findEmptyCell(grid: Grid): [number, number] | null {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col].value === null) {
        return [row, col];
      }
    }
  }
  return null;
}

export function generatePuzzle(difficulty: Difficulty): Grid {
  const grid: Grid = Array(9).fill(null).map(() => 
    Array(9).fill(null).map(() => ({ value: null, isFixed: false }))
  );

  // Fill diagonal boxes first (they are independent)
  for (let i = 0; i < 9; i += 3) {
    fillBox(grid, i, i);
  }

  // Fill the rest
  solveGrid(grid);

  // Remove numbers based on difficulty
  const cellsToRemove = {
    easy: 40,
    medium: 50,
    hard: 60
  }[difficulty];

  const positions = Array.from({ length: 81 }, (_, i) => ({
    row: Math.floor(i / 9),
    col: i % 9
  }));

  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // Remove numbers while ensuring unique solution
  for (let i = 0; i < cellsToRemove; i++) {
    const { row, col } = positions[i];
    const backup = grid[row][col].value;
    grid[row][col].value = null;

    // If removing this number creates multiple solutions, put it back
    const tempGrid = JSON.parse(JSON.stringify(grid));
    if (!hasUniqueSolution(tempGrid)) {
      grid[row][col].value = backup;
    }
  }

  // Mark remaining numbers as fixed
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col].value !== null) {
        grid[row][col].isFixed = true;
      }
    }
  }

  return grid;
}

// Helper function to fill a 3x3 box with random numbers
function fillBox(grid: Grid, startRow: number, startCol: number) {
  const numbers = Array.from({ length: 9 }, (_, i) => i);
  
  // Shuffle numbers
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  let index = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      grid[startRow + row][startCol + col].value = numbers[index++];
    }
  }
}

// Helper function to solve the grid
function solveGrid(grid: Grid): boolean {
  let row = 0;
  let col = 0;
  let isEmpty = false;

  // Find empty cell
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (grid[i][j].value === null) {
        row = i;
        col = j;
        isEmpty = true;
        break;
      }
    }
    if (isEmpty) break;
  }

  // If no empty cell found, puzzle is solved
  if (!isEmpty) return true;

  // Try digits 1-9
  for (let num = 0; num < 9; num++) {
    if (checkPlacement(grid, row, col, num)) {
      grid[row][col].value = num;
      if (solveGrid(grid)) return true;
      grid[row][col].value = null;
    }
  }

  return false;
}

// Helper function to check if puzzle has a unique solution
function hasUniqueSolution(grid: Grid): boolean {
  const solutions: Grid[] = [];
  findSolutions(grid, solutions);
  return solutions.length === 1;
}

// Helper function to find all solutions
function findSolutions(grid: Grid, solutions: Grid[]): void {
  let row = 0;
  let col = 0;
  let isEmpty = false;

  // Find empty cell
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (grid[i][j].value === null) {
        row = i;
        col = j;
        isEmpty = true;
        break;
      }
    }
    if (isEmpty) break;
  }

  // If no empty cell found, we found a solution
  if (!isEmpty) {
    solutions.push(JSON.parse(JSON.stringify(grid)));
    return;
  }

  // Try digits 1-9
  for (let num = 0; num < 9; num++) {
    if (checkPlacement(grid, row, col, num)) {
      grid[row][col].value = num;
      findSolutions(grid, solutions);
      grid[row][col].value = null;
      
      // Stop if we found more than one solution
      if (solutions.length > 1) return;
    }
  }
}

export function checkWin(grid: Grid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col].value === null) {
        return false;
      }
    }
  }
  return true;
}

export function checkPlacement(grid: Grid, row: number, col: number, value: number): boolean {
  // Check row
  for (let i = 0; i < 9; i++) {
    if (i !== col && grid[row][i].value === value) {
      return false;
    }
  }

  // Check column
  for (let i = 0; i < 9; i++) {
    if (i !== row && grid[i][col].value === value) {
      return false;
    }
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const currentRow = boxRow + i;
      const currentCol = boxCol + j;
      if (currentRow !== row && currentCol !== col && 
          grid[currentRow][currentCol].value === value) {
        return false;
      }
    }
  }

  return true;
} 