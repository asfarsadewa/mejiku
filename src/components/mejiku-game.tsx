"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GAME_COLORS } from "@/lib/colors";
import { Cell, Grid, Difficulty } from "@/types/game";
import { generatePuzzle, checkWin, checkPlacement } from "@/lib/game-logic";
import type p5 from "p5";

// Make grid size responsive
const GRID_SIZE = 9;
const BASE_CELL_SIZE = 50; // Desktop size
const MIN_CELL_SIZE = 35; // Mobile size
const GRID_PADDING = 20;
const ANIMATION_DURATION = 300; // ms

type AnimatingCell = {
  row: number;
  col: number;
  startTime: number;
  color: string;
};

// Update ColorCircle component
function ColorCircle({ 
  color, 
  patternType, 
  size,
  isSelected 
}: { 
  color: string, 
  patternType: number,
  size: number,
  isSelected: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import p5 inside the effect
    import("p5").then((p5Module) => {
      const p5 = p5Module.default;
      
      // Create a new p5 instance for each color circle
      const sketch = new p5((p: any) => {
        p.setup = () => {
          const canvas = p.createCanvas(size, size);
          canvas.parent(containerRef.current!);
        };

        p.draw = () => {
          p.clear();
          drawCellPattern(p, size/2, size/2, size, color, patternType, false, false);
        };
      }, containerRef.current);

      p5InstanceRef.current = sketch;
    });

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
      }
    };
  }, [color, patternType, size]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0"
      style={{ width: size, height: size }}
    />
  );
}

// Update ColorPalette component
function ColorPalette({ 
  colors, 
  selectedColor, 
  onColorSelect 
}: { 
  colors: typeof GAME_COLORS,
  selectedColor: number | null,
  onColorSelect: (index: number) => void
}) {
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {colors.map((color, index) => (
        <button
          key={color.name}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-transform hover:scale-105 ${
            selectedColor === index ? 'scale-110 ring-2 ring-black' : ''
          }`}
          onClick={() => onColorSelect(index)}
          title={color.name}
          style={{ 
            backgroundColor: color.value,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, transparent 60%, ${color.value} 60%)`,
            }}
          />
        </button>
      ))}
    </div>
  );
}

// Add this after the ColorPalette component
function GameControls({ 
  onSolve 
}: { 
  onSolve: () => void 
}) {
  return (
    <div className="mt-4 flex gap-2 justify-center">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onSolve}
        className="text-xs"
      >
        Help Solve
      </Button>
    </div>
  );
}

export function MejikuGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [grid, setGrid] = useState<Grid>(() => generatePuzzle("easy"));
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [cellSize, setCellSize] = useState(BASE_CELL_SIZE);
  const [errorCell, setErrorCell] = useState<[number, number] | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout>();
  const p5Instance = useRef<any>(null);
  const animatingCellsRef = useRef<AnimatingCell[]>([]);
  const [triggerRender, setTriggerRender] = useState(0);

  // Clear error after delay
  useEffect(() => {
    if (errorCell) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setErrorCell(null);
      }, 1000);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [errorCell]);

  // Responsive grid sizing
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const maxGridWidth = screenWidth - 32; // Account for padding
      const maxGridHeight = screenHeight * 0.6; // Use 60% of viewport height
      
      const calculatedCellSize = Math.min(
        Math.floor(maxGridWidth / GRID_SIZE),
        Math.floor(maxGridHeight / GRID_SIZE),
        BASE_CELL_SIZE
      );

      setCellSize(Math.max(calculatedCellSize, MIN_CELL_SIZE));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let p5: typeof import("p5").default;

    // Dynamically import p5 only on client side
    import("p5").then((p5Module) => {
      p5 = p5Module.default;

      const sketch = (p: p5) => {
        p.setup = () => {
          const canvas = p.createCanvas(
            GRID_SIZE * cellSize + GRID_PADDING * 2,
            GRID_SIZE * cellSize + GRID_PADDING * 2
          );
          canvas.parent(containerRef.current!);
        };

        p.draw = () => {
          p.background(255);
          drawGrid(p, cellSize);
          
          // Clean up animations in the draw loop
          const currentTime = Date.now();
          animatingCellsRef.current = animatingCellsRef.current.filter(
            anim => (currentTime - anim.startTime) < ANIMATION_DURATION
          );
          
          drawCells(p, grid, selectedCell, errorCell, cellSize, animatingCellsRef.current);
        };

        p.mousePressed = () => {
          const mouseX = p.mouseX - GRID_PADDING;
          const mouseY = p.mouseY - GRID_PADDING;

          if (mouseX >= 0 && mouseY >= 0) {
            const cellX = Math.floor(mouseX / cellSize);
            const cellY = Math.floor(mouseY / cellSize);

            if (cellX < GRID_SIZE && cellY < GRID_SIZE) {
              if (!grid[cellY][cellX].isFixed) {
                setSelectedCell([cellX, cellY]);
              }
            }
          }
        };
      };

      p5Instance.current = new p5(sketch);
    });

    return () => {
      if (p5Instance.current) {
        p5Instance.current.remove();
      }
    };
  }, [grid, selectedCell, errorCell, cellSize, triggerRender]);

  const handleColorSelect = (colorIndex: number) => {
    if (!selectedCell) return;
    const [x, y] = selectedCell;
    
    if (grid[y][x].isFixed) return;

    const newGrid = [...grid.map(row => [...row])];
    const oldValue = newGrid[y][x].value;
    newGrid[y][x] = { ...newGrid[y][x], value: colorIndex };
    
    // Add animation using ref
    animatingCellsRef.current = [...animatingCellsRef.current, {
      row: y,
      col: x,
      startTime: Date.now(),
      color: GAME_COLORS[colorIndex].value
    }];
    setTriggerRender(prev => prev + 1); // Force a render
    
    // Check if the placement is valid
    const isValid = checkPlacement(newGrid, y, x, colorIndex);
    
    if (!isValid) {
      // Show error feedback
      setErrorCell([x, y]);
      // Optionally revert the move
      // newGrid[y][x].value = oldValue;
    } else {
      setErrorCell(null);
    }
    
    setGrid(newGrid);
    
    if (checkWin(newGrid)) {
      setIsComplete(true);
    }
  };

  const startNewGame = (difficulty: Difficulty) => {
    setGrid(generatePuzzle(difficulty));
    setSelectedCell(null);
    setSelectedColor(null);
    setIsComplete(false);
  };

  const handleSolve = () => {
    // Create a copy of the current grid
    const newGrid = grid.map(row => 
      row.map(cell => ({
        ...cell,
        isFixed: cell.value !== null // Mark existing numbers as fixed
      }))
    );

    // Use the same solving algorithm from game-logic
    const solveGrid = (grid: Grid): boolean => {
      // Find empty cell
      let emptyCell: [number, number] | null = null;
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (grid[i][j].value === null) {
            emptyCell = [i, j];
            break;
          }
        }
        if (emptyCell) break;
      }

      // If no empty cells, puzzle is solved
      if (!emptyCell) return true;

      const [row, col] = emptyCell;

      // Try each color
      for (let color = 0; color < 9; color++) {
        if (checkPlacement(grid, row, col, color)) {
          grid[row][col].value = color;
          
          if (solveGrid(grid)) {
            return true;
          }
          
          grid[row][col].value = null;
        }
      }

      return false;
    };

    // Solve the puzzle
    if (solveGrid(newGrid)) {
      setGrid(newGrid);
      setSelectedCell(null);
      setSelectedColor(null);
    } else {
      console.error("No solution found - this shouldn't happen!");
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-4">
      <Card className="w-full mb-4">
        <CardContent className="p-4">
          <div className="flex gap-2 justify-center flex-wrap">
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => startNewGame("easy")}
            >
              Easy
            </Button>
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => startNewGame("medium")}
            >
              Medium
            </Button>
            <Button 
              size="sm"
              variant="outline" 
              onClick={() => startNewGame("hard")}
            >
              Hard
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="w-full mb-4">
        <CardContent className="p-4 flex justify-center">
          <div
            ref={containerRef}
            className="border border-gray-200 rounded-lg shadow-lg"
          />
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardContent className="p-4">
          <ColorPalette
            colors={GAME_COLORS}
            selectedColor={selectedColor}
            onColorSelect={handleColorSelect}
          />
          <GameControls onSolve={handleSolve} />
        </CardContent>
      </Card>

      {isComplete && (
        <WinCelebration onClose={() => startNewGame("easy")} />
      )}
    </div>
  );
}

function drawGrid(p: p5, cellSize: number) {
  p.stroke(0);
  p.strokeWeight(1);

  for (let i = 0; i <= GRID_SIZE; i++) {
    const lineWeight = i % 3 === 0 ? 2 : 1;
    p.strokeWeight(lineWeight);

    // Vertical lines
    p.line(
      i * cellSize + GRID_PADDING,
      GRID_PADDING,
      i * cellSize + GRID_PADDING,
      GRID_SIZE * cellSize + GRID_PADDING
    );

    // Horizontal lines
    p.line(
      GRID_PADDING,
      i * cellSize + GRID_PADDING,
      GRID_SIZE * cellSize + GRID_PADDING,
      i * cellSize + GRID_PADDING
    );
  }
}

function drawCells(
  p: p5, 
  grid: Grid, 
  selectedCell: [number, number] | null,
  errorCell: [number, number] | null,
  cellSize: number,
  animatingCells: AnimatingCell[]
) {
  const currentTime = Date.now();

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = grid[row][col];
      const x = col * cellSize + GRID_PADDING;
      const y = row * cellSize + GRID_PADDING;

      // Draw highlights first
      if (selectedCell && 
          selectedCell[0] === col && 
          selectedCell[1] === row && 
          !cell.isFixed) {
        p.fill(200, 200, 255, 100);
        p.noStroke();
        p.rect(x, y, cellSize, cellSize);
      }

      if (errorCell && errorCell[0] === col && errorCell[1] === row) {
        p.fill(255, 0, 0, 100);
        p.noStroke();
        p.rect(x, y, cellSize, cellSize);
      }

      // Draw cell value with pattern
      if (cell.value !== null) {
        const color = GAME_COLORS[cell.value];
        drawCellPattern(
          p, 
          x, 
          y, 
          cellSize, 
          color.value, 
          cell.value,
          cell.isFixed,
          errorCell && errorCell[0] === col && errorCell[1] === row
        );
      }
    }
  }

  // Draw animations
  animatingCells.forEach(anim => {
    const progress = (currentTime - anim.startTime) / ANIMATION_DURATION;
    if (progress < 1) {
      const x = anim.col * cellSize + GRID_PADDING;
      const y = anim.row * cellSize + GRID_PADDING;
      
      // Ripple effect
      p.noFill();
      p.stroke(anim.color);
      p.strokeWeight(2);
      const size = cellSize * (0.3 + progress * 0.7);
      p.circle(x + cellSize/2, y + cellSize/2, size);
    }
  });
}

// Enhanced pattern drawing function
function drawCellPattern(
  p: p5, 
  x: number, 
  y: number, 
  size: number, 
  color: string, 
  patternType: number,
  isFixed: boolean = false,
  isError: boolean = false
) {
  const center = { x: x + size/2, y: y + size/2 };
  p.push();
  p.translate(center.x, center.y);
  
  // Base circle with potential error transparency
  p.fill(isError ? p.color(color + '80') : color);
  p.noStroke();
  p.circle(0, 0, size * (isFixed ? 0.75 : 0.8));
  
  // Add pattern based on color index
  p.stroke(isFixed ? 255 : 'rgba(255,255,255,0.5)');
  p.strokeWeight(isFixed ? 1.5 : 1);
  
  switch (patternType) {
    case 0: // Dots in circle
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * p.TWO_PI;
        const r = size * 0.25;
        p.point(r * p.cos(angle), r * p.sin(angle));
      }
      break;
    case 1: // Cross lines
      const r1 = size * 0.3;
      p.line(-r1, -r1, r1, r1);
      p.line(-r1, r1, r1, -r1);
      break;
    case 2: // Concentric circles
      for (let r = size * 0.15; r <= size * 0.3; r += size * 0.15) {
        p.noFill();
        p.circle(0, 0, r * 2);
      }
      break;
    case 3: // Triangles
      const r2 = size * 0.25;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * p.TWO_PI;
        const x1 = r2 * p.cos(angle);
        const y1 = r2 * p.sin(angle);
        p.point(x1, y1);
      }
      break;
    case 4: // Square
      const s = size * 0.3;
      p.noFill();
      p.rect(-s/2, -s/2, s, s);
      break;
    case 5: // Parallel lines
      const r3 = size * 0.3;
      for (let i = -2; i <= 2; i++) {
        p.line(i * 4, -r3, i * 4, r3);
      }
      break;
    case 6: // Diamond
      const r4 = size * 0.3;
      p.noFill();
      p.beginShape();
      p.vertex(0, -r4);
      p.vertex(r4, 0);
      p.vertex(0, r4);
      p.vertex(-r4, 0);
      p.endShape(p.CLOSE);
      break;
    case 7: // Star
      const r5 = size * 0.3;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * p.TWO_PI;
        p.line(0, 0, r5 * p.cos(angle), r5 * p.sin(angle));
      }
      break;
    case 8: // Zigzag
      const r6 = size * 0.2;
      p.beginShape();
      for (let i = 0; i < 6; i++) {
        const x = ((i - 2.5) * r6/2);
        const y = (i % 2 ? r6 : -r6);
        p.vertex(x, y);
      }
      p.endShape();
      break;
  }
  
  // Add border for fixed cells
  if (isFixed) {
    p.noFill();
    p.stroke(0);
    p.strokeWeight(2);
    p.circle(0, 0, size * 0.85);
  }
  
  p.pop();
}

function WinCelebration({ onClose }: { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const sketch = (p: p5) => {
      const particles: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        color: string;
        size: number;
      }> = [];
      
      p.setup = () => {
        const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
        canvas.parent(containerRef.current!);
        
        // Create initial particles
        for (let i = 0; i < 100; i++) {
          particles.push({
            x: p.width / 2,
            y: p.height / 2,
            vx: p.random(-5, 5),
            vy: p.random(-5, 5),
            color: GAME_COLORS[Math.floor(p.random(9))].value,
            size: p.random(5, 15)
          });
        }
      };
      
      p.draw = () => {
        p.clear();
        
        particles.forEach(particle => {
          // Update
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.1; // gravity
          
          // Draw
          p.fill(particle.color);
          p.noStroke();
          p.circle(particle.x, particle.y, particle.size);
        });
      };
    };
    
    const p5Instance = new p5(sketch);
    return () => p5Instance.remove();
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div ref={containerRef} className="absolute inset-0" />
      <Card className="w-[90%] max-w-md relative z-10">
        <CardContent className="p-6 text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            Congratulations!
          </h2>
          <p className="mb-4">You solved the puzzle!</p>
          <Button onClick={onClose}>
            Play Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 