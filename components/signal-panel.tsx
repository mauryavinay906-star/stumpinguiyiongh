"use client"

import type { MarketSnapshot } from "@/lib/types"

const dirStyle: Record<string, string> = {
  LONG: "bg-long text-long-foreground",
  SHORT: "bg-short text-short-foreground",
  WAIT: "bg-muted text-muted-foreground",
}

export function SignalPanel({ snap }: { snap: MarketSnapshot | null }) {
  const s = snap?.signal
  return (
    <section className="flex flex-col border border-border bg-panel">
      <PanelTitle>SIGNAL</PanelTitle>
      <div className="p-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 min-w-24 items-center justify-center rounded-sm px-3 text-lg font-bold tracking-wider ${
              dirStyle[s?.direction ?? "WAIT"]
            }`}
          >
            {s?.direction ?? "—"}
          </span>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>CONFIDENCE</span>
              <span className="tabular text-foreground">{s?.confidence ?? 0}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 ${
                  s?.direction === "SHORT" ? "bg-short" : "bg-long"
                }`}
                style={{ width: `${s?.confidence ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        <ul className="mt-3 space-y-1">
          {s?.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] leading-tight text-muted-foreground">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border bg-secondary px-3 py-1.5 text-[10px] font-bold tracking-widest text-muted-foreground">
      {children}
    </div>
  )
}
