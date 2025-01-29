export const GAME_COLORS = [
  { name: 'Red', value: '#FF3B30' },      // Bright red
  { name: 'Blue', value: '#007AFF' },     // Vivid blue
  { name: 'Yellow', value: '#FFD60A' },   // Bright yellow
  { name: 'Purple', value: '#5856D6' },   // More blue-toned purple
  { name: 'Green', value: '#34C759' },    // Fresh green
  { name: 'Orange', value: '#FF9500' },   // Bright orange
  { name: 'Pink', value: '#FF2D8A' },     // More saturated pink
  { name: 'Cyan', value: '#5AC8FA' },     // Lighter cyan
  { name: 'Brown', value: '#8B572A' },    // Darker brown
] as const;

export type ColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; 