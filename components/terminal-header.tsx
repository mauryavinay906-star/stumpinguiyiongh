"use client"

import { useEffect, useState } from "react"
import type { MarketSnapshot } from "@/lib/types"
import { fmt, fmtPct } from "@/lib/format"

export function TerminalHeader({ snap }: { snap: MarketSnapshot | null }) {
  const [clock, setClock] = useState("")
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toUTCString().slice(17, 25) + " UTC")
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const up = snap ? snap.price >= snap.prevPrice : true
  const dirColor = up ? "text-long" : "text-short"

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border bg-panel px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-primary font-bold tracking-widest text-sm">XAU SCALP</span>
        <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          TERMINAL
        </span>
        <span className="text-xs text-muted-foreground">{snap?.symbol ?? "XAU/USDT"}</span>
      </div>

      <div className="flex items-center gap-6 tabular">
        <div className="flex items-baseline gap-2">
          <span className={`text-lg font-bold ${dirColor}`}>
            {snap ? fmt(snap.price) : "—"}
          </span>
          {snap && (
            <span className={`text-xs ${snap.changePct24h >= 0 ? "text-long" : "text-short"}`}>
              {fmtPct(snap.changePct24h)}
            </span>
          )}
        </div>
        <div className="hidden md:flex flex-col text-[10px] leading-tight text-muted-foreground">
          <span>H {snap ? fmt(snap.high24h) : "—"}</span>
          <span>L {snap ? fmt(snap.low24h) : "—"}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full animate-pulse-dot ${
              snap?.live ? "bg-long" : snap?.connected ? "bg-primary" : "bg-short"
            }`}
          />
          <span className="text-muted-foreground">
            {snap?.live ? "LIVE BINANCE" : snap?.connected ? "SIM FEED" : "CONNECTING"}
          </span>
        </div>
        <span className="tabular text-muted-foreground">{clock}</span>
      </div>
    </header>
  )
}
