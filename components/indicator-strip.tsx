"use client"

import type { MarketSnapshot } from "@/lib/types"
import { fmt } from "@/lib/format"

export function IndicatorStrip({ snap }: { snap: MarketSnapshot | null }) {
  const i = snap?.indicators
  const rsi = i?.rsi ?? 50
  const rsiTone = rsi <= 40 ? "text-long" : rsi >= 60 ? "text-short" : "text-foreground"

  const items: { k: string; v: string; tone?: string }[] = [
    { k: "EMA9", v: fmt(i?.ema9) },
    { k: "EMA21", v: fmt(i?.ema21) },
    { k: "EMA50", v: fmt(i?.ema50) },
    { k: "VWAP", v: fmt(i?.vwap) },
    { k: "RSI", v: rsi.toFixed(1), tone: rsiTone },
    { k: "ATR", v: fmt(i?.atr, 2) },
    { k: "MACD", v: fmt(i?.macdHist, 3), tone: (i?.macdHist ?? 0) >= 0 ? "text-long" : "text-short" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-border bg-panel px-4 py-1.5 text-[10px]">
      {items.map((it) => (
        <div key={it.k} className="flex items-center gap-1.5">
          <span className="tracking-wider text-muted-foreground">{it.k}</span>
          <span className={`tabular font-semibold ${it.tone ?? "text-foreground"}`}>{it.v}</span>
        </div>
      ))}
    </div>
  )
}
