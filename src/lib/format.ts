export function formatDate(d: string | Date | null): string {
  if (!d) return '-';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export function numberWithDelimiter(n: number | null): string {
  if (n == null) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function timeAgo(d: string | Date | null): string {
  if (!d) return '-';
  const now = new Date();
  const date = new Date(d);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
