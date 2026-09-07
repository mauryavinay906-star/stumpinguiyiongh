"use client"

import type { MarketSnapshot } from "@/lib/types"
import { fmt } from "@/lib/format"
import { PanelTitle } from "./signal-panel"

export function AiAssistant({ snap }: { snap: MarketSnapshot | null }) {
  const s = snap?.signal
  const score = s?.timingScore ?? 0
  const grade = score >= 75 ? "PRIME" : score >= 55 ? "GOOD" : score >= 35 ? "WAIT" : "AVOID"
  const gradeColor =
    score >= 75 ? "text-long" : score >= 55 ? "text-primary" : score >= 35 ? "text-muted-foreground" : "text-short"

  return (
    <section className="flex flex-col border border-primary/40 bg-panel">
      <PanelTitle>
        <span className="text-primary">◆ AI ENTRY ASSISTANT</span>
      </PanelTitle>
      <div className="space-y-3 p-3">
        {/* Best time to enter */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] tracking-wider text-muted-foreground">BEST TIME TO ENTER</span>
            <span className={`text-xs font-bold ${gradeColor}`}>{grade}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-500 ${
                score >= 75 ? "bg-long" : score >= 55 ? "bg-primary" : "bg-short"
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-foreground">{s?.timing}</p>
        </div>

        {/* Extension / limit order guidance */}
        <div className="rounded-sm border border-border bg-secondary/40 p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] tracking-wider text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${s?.extended ? "bg-short animate-pulse-dot" : "bg-long"}`} />
            {s?.extended ? "PRICE EXTENDED — LIMIT ORDER" : "ENTRY OK"}
          </div>
          <p className="text-[11px] leading-snug text-foreground">{s?.limitOrderHint}</p>
        </div>

        {/* Next trade alert */}
        <div>
          <div className="mb-1 text-[10px] tracking-wider text-muted-foreground">◈ NEXT TRADE ALERT</div>
          <p className="text-[11px] leading-snug text-foreground">{s?.nextAlert}</p>
          {s && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Mini label="ENTRY" value={fmt(s.entries[1].price)} tone="primary" />
              <Mini label="STOP" value={fmt(s.stop)} tone="short" />
              <Mini label="TARGET" value={fmt(s.targets[0].price)} tone="long" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Mini({ label, value, tone }: { label: string; value: string; tone: "primary" | "short" | "long" }) {
  const c = tone === "primary" ? "text-primary" : tone === "short" ? "text-short" : "text-long"
  return (
    <div className="rounded-sm bg-secondary/40 px-1 py-1.5">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={`tabular text-xs font-bold ${c}`}>{value}</div>
    </div>
  )
}
