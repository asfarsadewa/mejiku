"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GAME_COLORS } from "@/lib/colors";
import type { Grid, Difficulty } from "@/types/game";
import { generatePuzzle, checkWin, checkPlacement } from "@/lib/game-logic";
import type P5 from "p5";

// Update constants at the top
const GRID_SIZE = 9;
const BASE_CELL_SIZE = 50;
const MIN_CELL_SIZE = 35;
const GRID_PADDING = 16;
const CONTAINER_PADDING = 16;
const CARD_PADDING = 16;
const ANIMATION_DURATION = 300; // ms

type AnimatingCell = {
  row: number;
  col: number;
  startTime: number;
  color: string;
};

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
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-transform hover:scale-105 relative ${
            selectedColor === index ? 'scale-110 ring-2 ring-black' : ''
          }`}
          onClick={() => onColorSelect(index)}
          title={color.name}
          style={{ 
            backgroundColor: color.value,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-wrap justify-center items-center w-3/4 h-3/4">
              {[...Array(index + 1)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white m-0.5"
                />
              ))}
            </div>
          </div>
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
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const p5Instance = useRef<P5 | undefined>(undefined);
  const animatingCellsRef = useRef<AnimatingCell[]>([]);
  const [triggerRender, setTriggerRender] = useState(0);
  const isMounted = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  const [isLayoutReady, setIsLayoutReady] = useState(false);

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

  // Move resize logic to a separate function
  const calculateCellSize = () => {
    if (!containerRef.current) return BASE_CELL_SIZE;
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const totalPadding = GRID_PADDING * 2 + CONTAINER_PADDING + CARD_PADDING;
    const maxGridWidth = screenWidth - totalPadding;
    const maxGridHeight = screenHeight * 0.6;
    
    const calculatedCellSize = Math.min(
      Math.floor((maxGridWidth - 2) / GRID_SIZE), // Subtract 2 for border
      Math.floor(maxGridHeight / GRID_SIZE),
      BASE_CELL_SIZE
    );

    return Math.max(calculatedCellSize, MIN_CELL_SIZE);
  };

  // Handle layout initialization
  useEffect(() => {
    const handleResize = () => {
      setCellSize(calculateCellSize());
      setIsLayoutReady(true);
    };

    // Initial calculation
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Ensure layout is ready after a short delay on mobile
    const timeoutId = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Add this effect to handle mounting
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Clean up on unmount
      if (cleanup.current) {
        cleanup.current();
        cleanup.current = null;
      }
      // Also remove any canvas elements to be extra safe
      if (containerRef.current) {
        const canvases = containerRef.current.getElementsByTagName('canvas');
        Array.from(canvases).forEach(canvas => canvas.remove());
      }
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !isMounted.current || !isLayoutReady) return;

    // Clean up any existing p5 instance first
    if (cleanup.current) {
      cleanup.current();
      cleanup.current = null;
    }

    // Remove any existing canvases
    const canvases = containerRef.current.getElementsByTagName('canvas');
    Array.from(canvases).forEach(canvas => canvas.remove());

    let p5Constructor: typeof P5;

    const setupP5 = async () => {
      try {
        const p5Module = await import("p5");
        if (!isMounted.current) return; // Don't proceed if unmounted

        p5Constructor = p5Module.default;
        const sketch = (p: P5) => {
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
                  if (selectedCell && selectedCell[0] === cellX && selectedCell[1] === cellY) {
                    // If clicking the same cell, remove its value
                    const newGrid = [...grid.map(row => [...row])];
                    newGrid[cellY][cellX] = { ...newGrid[cellY][cellX], value: null };
                    setGrid(newGrid);
                    setSelectedCell(null);
                    setSelectedColor(null);
                  } else {
                    // Select the cell
                    setSelectedCell([cellX, cellY]);
                    // If a color is selected, place it
                    if (selectedColor !== null) {
                      handleColorSelect(selectedColor);
                    }
                  }
                }
              }
            }
          };
        };

        if (containerRef.current && isMounted.current) {
          p5Instance.current = new p5Constructor(sketch);
          
          cleanup.current = () => {
            if (p5Instance.current) {
              p5Instance.current.remove();
              p5Instance.current = undefined;
            }
          };
        }
      } catch (error) {
        console.error('Error setting up p5:', error);
      }
    };

    setupP5();

    return () => {
      if (cleanup.current) {
        cleanup.current();
        cleanup.current = null;
      }
    };
  }, [grid, selectedCell, errorCell, cellSize, triggerRender, isLayoutReady]);

  const handleColorSelect = (colorIndex: number) => {
    if (!selectedCell) return;
    const [x, y] = selectedCell;
    
    if (grid[y][x].isFixed) return;

    const newGrid = [...grid.map(row => [...row])];
    const oldValue = newGrid[y][x].value;

    // Clear cell if clicking the same color that's already there
    if (oldValue === colorIndex) {
      newGrid[y][x] = { ...newGrid[y][x], value: null };
      setGrid(newGrid);
      setSelectedCell(null); // Clear selection after removing
      setSelectedColor(null); // Clear selected color
      return;
    }
    
    newGrid[y][x] = { ...newGrid[y][x], value: colorIndex };
    setSelectedColor(colorIndex); // Set the selected color
    
    // Add animation using ref
    animatingCellsRef.current = [...animatingCellsRef.current, {
      row: y,
      col: x,
      startTime: Date.now(),
      color: GAME_COLORS[colorIndex].value
    }];
    setTriggerRender(prev => prev + 1);
    
    // Check if the placement is valid
    const isValid = checkPlacement(newGrid, y, x, colorIndex);
    
    if (!isValid) {
      setErrorCell([x, y]);
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
        <CardContent className="p-2 flex justify-center">
          <div
            ref={containerRef}
            className="border border-gray-200 rounded-lg shadow-lg overflow-hidden"
            style={{ 
              width: isLayoutReady ? `${GRID_SIZE * cellSize + GRID_PADDING * 2}px` : 'auto',
              height: isLayoutReady ? `${GRID_SIZE * cellSize + GRID_PADDING * 2}px` : 'auto',
              maxWidth: `calc(100% - ${CARD_PADDING}px)`
            }}
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

function drawGrid(p: P5, cellSize: number) {
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
  p: P5, 
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
          errorCell && errorCell[0] === col && errorCell[1] === row || false
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
  p: P5, 
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
  p.fill(isError ? p.color(color + '80') : p.color(color));
  p.noStroke();
  p.circle(0, 0, size * (isFixed ? 0.75 : 0.8));
  
  // Draw dots
  p.fill(255); // White dots
  p.noStroke();
  
  const dotCount = patternType + 1; // 1 to 9 dots
  const dotSize = size * 0.1; // Dot size relative to cell size
  
  if (dotCount === 1) {
    // Single dot in center
    p.circle(0, 0, dotSize);
  } else if (dotCount === 2) {
    // Two dots diagonal
    p.circle(-size * 0.15, -size * 0.15, dotSize);
    p.circle(size * 0.15, size * 0.15, dotSize);
  } else if (dotCount === 3) {
    // Three dots in triangle
    for (let i = 0; i < 3; i++) {
      const angle = (i * p.TWO_PI / 3) + p.PI / 6;
      const r = size * 0.2;
      p.circle(r * p.cos(angle), r * p.sin(angle), dotSize);
    }
  } else if (dotCount === 4) {
    // Four dots in square
    for (let i = 0; i < 4; i++) {
      const angle = (i * p.TWO_PI / 4) + p.PI / 4;
      const r = size * 0.2;
      p.circle(r * p.cos(angle), r * p.sin(angle), dotSize);
    }
  } else if (dotCount === 5) {
    // Five dots like dice
    for (let i = 0; i < 4; i++) {
      const angle = (i * p.TWO_PI / 4) + p.PI / 4;
      const r = size * 0.2;
      p.circle(r * p.cos(angle), r * p.sin(angle), dotSize);
    }
    p.circle(0, 0, dotSize); // Center dot
  } else if (dotCount === 6) {
    // Six dots in hexagon
    for (let i = 0; i < 6; i++) {
      const angle = (i * p.TWO_PI / 6);
      const r = size * 0.2;
      p.circle(r * p.cos(angle), r * p.sin(angle), dotSize);
    }
  } else if (dotCount === 7) {
    // Six dots in hexagon plus center
    for (let i = 0; i < 6; i++) {
      const angle = (i * p.TWO_PI / 6);
      const r = size * 0.2;
      p.circle(r * p.cos(angle), r * p.sin(angle), dotSize);
    }
    p.circle(0, 0, dotSize); // Center dot
  } else if (dotCount === 8) {
    // Eight dots in octagon
    for (let i = 0; i < 8; i++) {
      const angle = (i * p.TWO_PI / 8);
      const r = size * 0.2;
      p.circle(r * p.cos(angle), r * p.sin(angle), dotSize);
    }
  } else if (dotCount === 9) {
    // Nine dots in 3x3 grid
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        p.circle(i * size * 0.15, j * size * 0.15, dotSize);
      }
    }
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
    
    // Dynamically import p5
    import("p5").then((p5Module) => {
      const p5Constructor = p5Module.default;
      
      const sketch = (p: P5) => {
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
      
      const p5Instance = new p5Constructor(sketch);
      return () => p5Instance.remove();
    });
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