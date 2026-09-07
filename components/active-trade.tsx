"use client"

import type { MarketSnapshot, ActiveTrade as ActiveTradeT, ClosedTrade } from "@/lib/types"
import { fmt } from "@/lib/format"
import { PanelTitle } from "./signal-panel"

export function ActiveTradePanel({
  snap,
  active,
  history,
  onOpen,
  onClose,
}: {
  snap: MarketSnapshot | null
  active: ActiveTradeT | null
  history: ClosedTrade[]
  onOpen: () => void
  onClose: (exit: number, outcome: "SL") => void
}) {
  const price = snap?.price ?? 0
  const canOpen = snap?.signal.direction !== "WAIT"

  let livePnlR = 0
  let progress = 0
  if (active) {
    const risk = Math.abs(active.entry - active.stop) || 1
    livePnlR = active.direction === "LONG" ? (price - active.entry) / risk : (active.entry - price) / risk
    const t1 = active.targets[0].price
    const span = Math.abs(t1 - active.entry) || 1
    progress = Math.max(0, Math.min(100, (Math.abs(price - active.entry) / span) * 100 * Math.sign(livePnlR || 1)))
  }

  return (
    <section className="flex flex-col border border-border bg-panel">
      <PanelTitle>ACTIVE TRADE</PanelTitle>
      <div className="p-3">
        {active ? (
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`rounded-sm px-2 py-0.5 text-xs font-bold ${
                  active.direction === "LONG" ? "bg-long text-long-foreground" : "bg-short text-short-foreground"
                }`}
              >
                {active.direction} ▶ {active.entryLabel}
              </span>
              <span className={`tabular text-sm font-bold ${livePnlR >= 0 ? "text-long" : "text-short"}`}>
                {livePnlR >= 0 ? "+" : ""}
                {livePnlR.toFixed(2)}R
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
              <Cell label="ENTRY" value={fmt(active.entry)} />
              <Cell label="STOP" value={fmt(active.stop)} tone="short" />
              <Cell label="NOW" value={fmt(price)} tone={livePnlR >= 0 ? "long" : "short"} />
              <Cell label="T1" value={fmt(active.targets[0].price)} tone="long" />
              <Cell label="T2" value={fmt(active.targets[1].price)} tone="long" />
              <div className="rounded-sm bg-secondary/40 px-1 py-1.5">
                <div className="text-muted-foreground">R:R</div>
                <div className="tabular font-bold">{active.targets[0].rr.toFixed(1)}</div>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${livePnlR >= 0 ? "bg-long" : "bg-short"}`}
                style={{ width: `${Math.abs(progress)}%` }}
              />
            </div>
            <button
              onClick={() => onClose(price, "SL")}
              className="mt-3 w-full rounded-sm border border-border bg-secondary py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              CLOSE MANUALLY @ {fmt(price)}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-3 text-[11px] text-muted-foreground">
              {canOpen ? "Signal ready — arm a virtual trade to track it live." : "No signal — waiting for setup."}
            </p>
            <button
              onClick={onOpen}
              disabled={!canOpen}
              className={`w-full rounded-sm py-2 text-xs font-bold transition-colors ${
                canOpen
                  ? snap?.signal.direction === "LONG"
                    ? "bg-long text-long-foreground hover:opacity-90"
                    : "bg-short text-short-foreground hover:opacity-90"
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              }`}
            >
              {canOpen ? `ARM ${snap?.signal.direction} TRADE` : "STANDBY"}
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-3 border-t border-border pt-2">
            <div className="mb-1 text-[9px] tracking-widest text-muted-foreground">HISTORY</div>
            <div className="space-y-0.5">
              {history.slice(0, 4).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-[10px]">
                  <span className={h.direction === "LONG" ? "text-long" : "text-short"}>{h.direction}</span>
                  <span className="text-muted-foreground">{h.outcome}</span>
                  <span className={`tabular ${h.pnlR >= 0 ? "text-long" : "text-short"}`}>
                    {h.pnlR >= 0 ? "+" : ""}
                    {h.pnlR.toFixed(2)}R
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "long" | "short" }) {
  const c = tone === "long" ? "text-long" : tone === "short" ? "text-short" : "text-foreground"
  return (
    <div className="rounded-sm bg-secondary/40 px-1 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className={`tabular font-bold ${c}`}>{value}</div>
    </div>
  )
}
