export function formatScoreType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

export function getDiceFace(value: number): string {
  return DICE_FACES[value - 1] ?? '?';
}
