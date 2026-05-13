import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS classes and handles conditional classes safely.
 * Uses clsx for conditional logic and tailwind-merge to prevent conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
