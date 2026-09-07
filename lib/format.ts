export function fmt(n: number | undefined | null, d = 2): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—"
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function fmtSigned(n: number, d = 2): string {
  const s = fmt(Math.abs(n), d)
  return `${n >= 0 ? "+" : "-"}${s}`
}

export function fmtPct(n: number, d = 2): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  return `${m}m ago`
}
