import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const appName = process.env.NEXT_PUBLIC_APP_NAME || 'FiyatPusulası';

export function formatDate(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR');
}

export function confidenceBadge(confidence?: number) {
  if (confidence === undefined || Number.isNaN(confidence)) return { label: 'Low', tone: 'muted' as const };
  if (confidence >= 0.8) return { label: 'High', tone: 'success' as const };
  if (confidence >= 0.6) return { label: 'Medium', tone: 'info' as const };
  return { label: 'Low', tone: 'warning' as const };
}
