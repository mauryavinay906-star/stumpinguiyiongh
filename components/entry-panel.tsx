"use client"

import type { MarketSnapshot } from "@/lib/types"
import { fmt } from "@/lib/format"
import { PanelTitle } from "./signal-panel"

export function EntryPanel({ snap }: { snap: MarketSnapshot | null }) {
  const s = snap?.signal
  const ind = snap?.indicators
  const isShort = s?.direction === "SHORT" || (s?.direction === "WAIT" && (ind?.distToVwapAbs ?? 0) > 0)

  return (
    <section className="flex flex-col border border-border bg-panel">
      <PanelTitle>IDEAL ENTRY ZONES</PanelTitle>
      <div className="divide-y divide-border">
        {s?.entries.map((e, i) => (
          <div key={e.label} className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-sm text-[10px] font-bold ${
                  i === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <div>
                <div className="text-xs font-semibold">
                  {e.label}
                  {i === 1 && <span className="ml-1.5 text-[9px] text-primary">◄ IDEAL</span>}
                </div>
                <div className="text-[10px] text-muted-foreground">{e.note}</div>
              </div>
            </div>
            <span className="tabular text-sm font-bold text-primary">{fmt(e.price)}</span>
          </div>
        ))}
      </div>

      <PanelTitle>RISK &amp; TARGETS</PanelTitle>
      <div className="divide-y divide-border">
        <Row label="Stop Loss" value={fmt(s?.stop)} valueClass="text-short" />
        {s?.targets.map((t) => (
          <div key={t.label} className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] text-muted-foreground">
              {t.label} <span className="text-[9px]">({t.rr.toFixed(1)}R)</span>
            </span>
            <span className="tabular text-sm font-semibold text-long">{fmt(t.price)}</span>
          </div>
        ))}
      </div>

      <PanelTitle>SWING LEVELS</PanelTitle>
      <div className="divide-y divide-border">
        <Row label="Swing High" value={fmt(ind?.swingHigh)} valueClass="text-long" />
        <Row label="Swing Low" value={fmt(ind?.swingLow)} valueClass="text-short" />
      </div>

      <PanelTitle>DISTANCE (REAL-TIME)</PanelTitle>
      <div className="divide-y divide-border">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground">→ EMA9 ({fmt(ind?.ema9)})</span>
          <span className={`tabular text-xs ${(ind?.distToEma9Abs ?? 0) >= 0 ? "text-long" : "text-short"}`}>
            {(ind?.distToEma9Abs ?? 0) >= 0 ? "+" : ""}
            {fmt(ind?.distToEma9Abs)} ({(ind?.distToEma9Pct ?? 0).toFixed(2)}%)
          </span>
        </div>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[11px] text-muted-foreground">→ VWAP ({fmt(ind?.vwap)})</span>
          <span className={`tabular text-xs ${(ind?.distToVwapAbs ?? 0) >= 0 ? "text-long" : "text-short"}`}>
            {(ind?.distToVwapAbs ?? 0) >= 0 ? "+" : ""}
            {fmt(ind?.distToVwapAbs)} ({(ind?.distToVwapPct ?? 0).toFixed(2)}%)
          </span>
        </div>
      </div>
    </section>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`tabular text-sm font-semibold ${valueClass ?? ""}`}>{value}</span>
    </div>
  )
}
