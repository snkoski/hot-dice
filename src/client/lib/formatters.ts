/**
 * Format score type for display (e.g., THREE_OF_KIND -> "Three Of Kind")
 */
export function formatScoreType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
