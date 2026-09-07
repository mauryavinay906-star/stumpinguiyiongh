"use client"

import dynamic from "next/dynamic"
import { useMarket, useTradeTracker } from "@/lib/use-market"
import { TerminalHeader } from "./terminal-header"
import { IndicatorStrip } from "./indicator-strip"
import { SignalPanel } from "./signal-panel"
import { EntryPanel } from "./entry-panel"
import { AiAssistant } from "./ai-assistant"
import { ActiveTradePanel } from "./active-trade"

// lightweight-charts touches window — load client-only
const PriceChart = dynamic(() => import("./price-chart").then((m) => m.PriceChart), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      loading chart…
    </div>
  ),
})

export function Terminal() {
  const snap = useMarket()
  const { active, history, openTrade, closeTrade } = useTradeTracker(snap)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <TerminalHeader snap={snap} />
      <IndicatorStrip snap={snap} />

      <main className="grid flex-1 grid-cols-1 gap-2 overflow-y-auto p-2 lg:grid-cols-[1fr_360px]">
        {/* Left: chart + signal */}
        <div className="flex min-h-0 flex-col gap-2">
          <div className="min-h-[320px] flex-1 border border-border bg-panel lg:min-h-0">
            <PriceChart snap={snap} />
          </div>
          <SignalPanel snap={snap} />
        </div>

        {/* Right: entries, AI, active trade */}
        <div className="flex flex-col gap-2">
          <AiAssistant snap={snap} />
          <ActiveTradePanel
            snap={snap}
            active={active}
            history={history}
            onOpen={openTrade}
            onClose={closeTrade}
          />
          <EntryPanel snap={snap} />
        </div>
      </main>
    </div>
  )
}
