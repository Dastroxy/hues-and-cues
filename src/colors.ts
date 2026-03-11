export const ROWS = 20
export const COLS = 24
export const ROW_LABELS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T']
export const COL_LABELS = Array.from({ length: 24 }, (_, i) => String(i + 1))

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export const COLOR_GRID: string[][] = (() => {
  const grid: string[][] = []
  for (let row = 0; row < ROWS; row++) {
    const rowColors: string[] = []
    for (let col = 0; col < COLS; col++) {
      const hue = (col / COLS) * 360
      const lightness = 95 - (row / (ROWS - 1)) * 75
      const saturation = 20 + Math.sin((row / ROWS) * Math.PI) * 80
      rowColors.push(hslToHex(hue, saturation, lightness))
    }
    grid.push(rowColors)
  }
  return grid
})()

export function getColor(row: number, col: number): string {
  return COLOR_GRID[row]?.[col] ?? '#888'
}

export function getCoord(row: number, col: number): string {
  return `${ROW_LABELS[row]}${COL_LABELS[col]}`
}

// Chebyshev distance scoring
export function getScore(row: number, col: number, targetRow: number, targetCol: number): number {
  const dist = Math.max(Math.abs(row - targetRow), Math.abs(col - targetCol))
  if (dist === 0) return 3
  if (dist === 1) return 2
  if (dist === 2) return 1
  return 0
}

export const PLAYER_COLORS = [
  '#7c6af7','#f76a8f','#6af7c8','#f7d06a',
  '#6ab4f7','#f7a06a','#b46af7','#6af78e',
  '#f76a6a','#6af7f0'
]
