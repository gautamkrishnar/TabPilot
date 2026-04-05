import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getFaviconUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=example.com&sz=32`;
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand('copy');
    textarea.remove();
  }
}

export function getJoinUrl(joinCode: string): string {
  const base = globalThis.location.origin;
  return `${base}/join?code=${joinCode}`;
}

export function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  const start = url.substring(0, maxLen - 3);
  return `${start}...`;
}

export function getDiceBearUrl(seed: string, size = 40): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}&size=${size}&backgroundColor=6366f1,8b5cf6,06b6d4,10b981&backgroundType=gradientLinear`;
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
