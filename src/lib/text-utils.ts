/**
 * Trims text to specified length and adds ellipsis if needed
 */
export function trimText(text: string, maxLength: number = 20): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Trims text specifically for training package names
 * Uses 25 characters as default for better readability in cards
 */
export function trimTrainingName(text: string): string {
  return trimText(text, 25);
}
