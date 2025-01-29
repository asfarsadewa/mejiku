# Mejiku - Color Sudoku Game

Mejiku is a colorful twist on the classic Sudoku puzzle game. Instead of numbers 1-9, players use colors to solve the grid while following similar rules to traditional Sudoku.

## 🎮 Game Rules

- Fill a 9x9 grid with colors
- Each row must contain each color exactly once
- Each column must contain each color exactly once
- Each 3x3 sub-grid must contain each color exactly once
- Pre-filled cells (marked with black borders) cannot be modified

## 🎯 Features

- Three difficulty levels: Easy, Medium, and Hard
- Visual feedback for incorrect moves
- Responsive design that works on desktop and mobile devices
- Guaranteed unique solution for each puzzle
- Real-time validation of moves
- Celebration screen upon completion

## 🛠️ Tech Stack

- [Next.js 15](https://nextjs.org/) - React Framework
- [React 19](https://react.dev/) - UI Library
- [P5.js](https://p5js.org/) - Creative Coding Library
- [Shadcn/ui](https://ui.shadcn.com/) - UI Components
- [TypeScript](https://www.typescriptlang.org/) - Type Safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mejiku.git
cd mejiku
```

2. Install dependencies:
```bash
bun install
```

3. Run the development server:
```bash
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to play the game.

## 🎨 Color Palette

The game uses a carefully selected color palette that is:
- Visually distinct
- Accessible for color-blind users
- Aesthetically pleasing

Colors used:
- Red (#FF3B30)
- Blue (#007AFF)
- Yellow (#FFD60A)
- Purple (#AF52DE)
- Green (#34C759)
- Orange (#FF9500)
- Magenta (#9C1AB1)
- Cyan (#32ADE6)
- Brown (#8B572A)

## 🎯 Game Mechanics

- Click/tap an empty cell to select it
- Click/tap a color from the palette to place it
- Invalid placements will show a red highlight
- Fixed cells (part of the initial puzzle) have black borders
- The game is won when all cells are filled correctly

## 🧩 Difficulty Levels

- Easy: 40 cells to fill
- Medium: 50 cells to fill
- Hard: 60 cells to fill

Each puzzle is guaranteed to have exactly one solution.

## 📱 Mobile Support

The game is fully responsive and supports:
- Touch interactions
- Different screen sizes
- Portrait and landscape orientations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by classic Sudoku puzzles
- Built with modern web technologies
- Designed for accessibility and user experience

## 🐛 Bug Reports

If you find a bug, please open an issue with:
1. Description of the bug
2. Steps to reproduce
3. Expected behavior
4. Screenshots (if applicable)
