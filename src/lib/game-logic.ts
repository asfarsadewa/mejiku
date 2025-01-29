import { Cell, Grid, Difficulty } from "@/types/game";
import { ColorIndex } from "./colors";

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
  let startRow = row - (row % 3), startCol = col - (col % 3);
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

// Improved solver that returns all possible solutions
function countSolutions(grid: Grid, limit: number = 2): number {
  let solutions = 0;
  const empty = findEmptyCell(grid);
  
  if (!empty) return 1; // Grid is filled
  
  const [row, col] = empty;
  
  // Try each number
  for (let num = 0; num < 9; num++) {
    if (isValid(grid, row, col, num)) {
      grid[row][col].value = num;
      solutions += countSolutions(grid, limit - solutions);
      grid[row][col].value = null;
      
      if (solutions >= limit) break; // Stop if we found enough solutions
    }
  }
  
  return solutions;
}

// Generate a complete valid solution
function generateSolution(grid: Grid): boolean {
  const empty = findEmptyCell(grid);
  if (!empty) return true;
  
  const [row, col] = empty;
  const numbers = Array.from({length: 9}, (_, i) => i);
  
  // Shuffle numbers for randomization
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  for (const num of numbers) {
    if (isValid(grid, row, col, num)) {
      grid[row][col].value = num;
      if (generateSolution(grid)) return true;
      grid[row][col].value = null;
    }
  }
  
  return false;
}

export function generatePuzzle(difficulty: Difficulty): Grid {
  const grid = createEmptyGrid();
  
  // Generate a complete solution
  generateSolution(grid);
  
  // First mark all cells as fixed
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      grid[i][j].isFixed = true;
    }
  }
  
  // Remove numbers based on difficulty
  const cellsToRemove = {
    easy: 40,
    medium: 50,
    hard: 60,
  }[difficulty];
  
  const positions = Array.from({ length: 81 }, (_, i) => i);
  
  // Shuffle positions for random removal
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  let removed = 0;
  
  // Try removing numbers while ensuring unique solution
  for (const pos of positions) {
    if (removed >= cellsToRemove) break;
    
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    const temp = grid[row][col].value;
    
    grid[row][col].value = null;
    grid[row][col].isFixed = false;  // Only unfix cells we remove
    
    // Count solutions with this number removed
    const solutions = countSolutions(grid);
    
    // If multiple solutions exist, put the number back
    if (solutions !== 1) {
      grid[row][col].value = temp;
      grid[row][col].isFixed = true;
    } else {
      removed++;
    }
  }
  
  return grid;
}

export function checkWin(grid: Grid): boolean {
  // Check if grid is completely filled
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (grid[i][j].value === null) return false;
    }
  }

  // Check each row, column and box
  for (let i = 0; i < 9; i++) {
    const rowNums = new Set();
    const colNums = new Set();
    const boxNums = new Set();
    
    for (let j = 0; j < 9; j++) {
      // Check row
      rowNums.add(grid[i][j].value);
      
      // Check column
      colNums.add(grid[j][i].value);
      
      // Check 3x3 box
      const boxRow = Math.floor(i / 3) * 3 + Math.floor(j / 3);
      const boxCol = (i % 3) * 3 + (j % 3);
      boxNums.add(grid[boxRow][boxCol].value);
    }
    
    if (rowNums.size !== 9 || colNums.size !== 9 || boxNums.size !== 9) {
      return false;
    }
  }

  return true;
}

export function checkPlacement(grid: Grid, row: number, col: number, value: number): boolean {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (x !== col && grid[row][x].value === value) {
      return false;
    }
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (x !== row && grid[x][col].value === value) {
      return false;
    }
  }

  // Check 3x3 box
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (startRow + i !== row || startCol + j !== col) {
        if (grid[startRow + i][startCol + j].value === value) {
          return false;
        }
      }
    }
  }

  return true;
} 