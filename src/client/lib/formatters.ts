/**
 * Format score type for display
 */
export function formatScoreType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format percentages
 */
export function formatPercent(num: number): string {
  return `${(num * 100).toFixed(1)}%`;
}
