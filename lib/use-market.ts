"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Candle, MarketSnapshot, ActiveTrade, ClosedTrade, TradeOutcome } from "./types"
import { computeIndicators, generateSignal } from "./signal-engine"
import { DISPLAY_SYMBOL, fetchKlines, fetch24h, subscribeKlines } from "./binance"
import { seedCandles, tickSimulated } from "./simulator"

const MAX_CANDLES = 200

function buildSnapshot(
  candles: Candle[],
  prevPrice: number,
  t24: { changePct: number; high: number; low: number; volume: number } | null,
  connected: boolean,
  live: boolean,
): MarketSnapshot {
  const indicators = computeIndicators(candles)
  const signal = generateSignal(candles, indicators)
  const price = candles.at(-1)?.close ?? 0
  return {
    symbol: DISPLAY_SYMBOL,
    price,
    prevPrice,
    changePct24h: t24?.changePct ?? 0,
    high24h: t24?.high ?? Math.max(...candles.map((c) => c.high)),
    low24h: t24?.low ?? Math.min(...candles.map((c) => c.low)),
    volume24h: t24?.volume ?? 0,
    candles,
    indicators,
    signal,
    connected,
    live,
    updatedAt: Date.now(),
  }
}

export function useMarket() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null)
  const candlesRef = useRef<Candle[]>([])
  const prevPriceRef = useRef<number>(0)
  const t24Ref = useRef<{ changePct: number; high: number; low: number; volume: number } | null>(null)
  const liveRef = useRef<boolean>(false)

  const push = useCallback((connected: boolean) => {
    const candles = candlesRef.current
    if (candles.length === 0) return
    const price = candles.at(-1)!.close
    setSnapshot(buildSnapshot(candles, prevPriceRef.current, t24Ref.current, connected, liveRef.current))
    prevPriceRef.current = price
  }, [])

  const applyUpdate = useCallback(
    (candle: Candle, isFinal: boolean) => {
      const candles = candlesRef.current
      const last = candles.at(-1)
      if (last && last.time === candle.time) {
        candles[candles.length - 1] = candle
      } else {
        candles.push(candle)
        if (candles.length > MAX_CANDLES) candles.shift()
      }
      push(true)
    },
    [push],
  )

  useEffect(() => {
    let cleanup: (() => void) | null = null
    let simTimer: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    async function startSimulated() {
      liveRef.current = false
      candlesRef.current = seedCandles(MAX_CANDLES)
      prevPriceRef.current = candlesRef.current.at(-1)!.close
      push(true)
      simTimer = setInterval(() => {
        if (cancelled) return
        const { candle } = tickSimulated(candlesRef.current)
        applyUpdate(candle, false)
      }, 1200)
    }

    async function start() {
      try {
        const [klines, t24] = await Promise.all([fetchKlines(MAX_CANDLES), fetch24h()])
        if (cancelled) return
        liveRef.current = true
        candlesRef.current = klines
        t24Ref.current = t24
        prevPriceRef.current = klines.at(-1)!.close
        push(true)

        cleanup = subscribeKlines(
          ({ candle, isFinal }) => {
            if (cancelled) return
            applyUpdate(candle, isFinal)
          },
          () => {
            // websocket dropped — fall back to sim without losing history
            if (cancelled) return
            liveRef.current = false
            if (!simTimer) {
              simTimer = setInterval(() => {
                if (cancelled) return
                const { candle } = tickSimulated(candlesRef.current)
                applyUpdate(candle, false)
              }, 1200)
            }
          },
        )
      } catch {
        if (!cancelled) startSimulated()
      }
    }

    start()
    return () => {
      cancelled = true
      cleanup?.()
      if (simTimer) clearInterval(simTimer)
    }
  }, [push, applyUpdate])

  return snapshot
}

// Active-trade tracking: opens a virtual trade from the signal and tracks it
// against SL / T1 / T2 as price moves.
export function useTradeTracker(snapshot: MarketSnapshot | null) {
  const [active, setActive] = useState<ActiveTrade | null>(null)
  const [history, setHistory] = useState<ClosedTrade[]>([])
  const activeRef = useRef<ActiveTrade | null>(null)
  activeRef.current = active

  const openTrade = useCallback(() => {
    if (!snapshot) return
    const s = snapshot.signal
    if (s.direction === "WAIT") return
    const entry = s.entries[0].price // aggressive/market
    const trade: ActiveTrade = {
      id: `${Date.now()}`,
      direction: s.direction,
      entry,
      stop: s.stop,
      targets: s.targets,
      openedAt: Date.now(),
      entryLabel: "Aggressive",
    }
    setActive(trade)
  }, [snapshot])

  const closeTrade = useCallback(
    (exit: number, outcome: TradeOutcome) => {
      const t = activeRef.current
      if (!t) return
      const risk = Math.abs(t.entry - t.stop) || 1
      const pnl =
        t.direction === "LONG" ? (exit - t.entry) / risk : (t.entry - exit) / risk
      const closed: ClosedTrade = { ...t, closedAt: Date.now(), exit, outcome, pnlR: pnl }
      setHistory((h) => [closed, ...h].slice(0, 20))
      setActive(null)
    },
    [],
  )

  // auto-manage active trade
  useEffect(() => {
    if (!snapshot || !active) return
    const price = snapshot.price
    const t1 = active.targets[0]?.price
    const t2 = active.targets[1]?.price
    if (active.direction === "LONG") {
      if (price <= active.stop) closeTrade(price, "SL")
      else if (t2 && price >= t2) closeTrade(price, "TP2")
      else if (t1 && price >= t1) closeTrade(price, "TP1")
    } else {
      if (price >= active.stop) closeTrade(price, "SL")
      else if (t2 && price <= t2) closeTrade(price, "TP2")
      else if (t1 && price <= t1) closeTrade(price, "TP1")
    }
  }, [snapshot, active, closeTrade])

  return { active, history, openTrade, closeTrade }
}
