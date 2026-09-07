import type { Candle, Indicators, Signal, Direction, EntryZone, Target } from "./types"
import { ema, rsi, atr, vwap, macd, swingLevels } from "./indicators"

export function computeIndicators(candles: Candle[]): Indicators {
  const closes = candles.map((c) => c.close)
  const price = closes.at(-1) ?? 0

  const ema9 = ema(closes, 9).at(-1) ?? price
  const ema21 = ema(closes, 21).at(-1) ?? price
  const ema50 = ema(closes, 50).at(-1) ?? price
  const vw = vwap(candles)
  const r = rsi(closes, 14)
  const a = atr(candles, 14)
  const m = macd(closes)
  const swings = swingLevels(candles, 30)

  const distToEma9Abs = price - ema9
  const distToVwapAbs = price - vw

  return {
    ema9,
    ema21,
    ema50,
    vwap: vw,
    rsi: r,
    atr: a,
    macd: m.macd,
    macdSignal: m.signal,
    macdHist: m.hist,
    distToEma9Abs,
    distToVwapAbs,
    distToEma9Pct: ema9 ? (distToEma9Abs / ema9) * 100 : 0,
    distToVwapPct: vw ? (distToVwapAbs / vw) * 100 : 0,
    swingHigh: swings.high,
    swingLow: swings.low,
  }
}

/**
 * Relaxed signal generation. Instead of demanding a strict confluence, we
 * score bullish/bearish evidence and lean on RSI extreme zones + proximity to
 * EMA9/VWAP so signals fire more often. Entry zones, dual targets and swing
 * levels are ALWAYS computed, even when the headline direction is WAIT.
 */
export function generateSignal(candles: Candle[], ind: Indicators): Signal {
  const price = candles.at(-1)?.close ?? 0
  const atrVal = ind.atr || price * 0.001

  let bull = 0
  let bear = 0
  const reasons: string[] = []

  // Trend structure
  if (ind.ema9 > ind.ema21) {
    bull += 1.5
    reasons.push("EMA9 > EMA21 (short-term up)")
  } else {
    bear += 1.5
    reasons.push("EMA9 < EMA21 (short-term down)")
  }
  if (price > ind.ema50) bull += 1
  else bear += 1

  // VWAP bias
  if (price > ind.vwap) {
    bull += 1
    reasons.push("Above VWAP")
  } else {
    bear += 1
    reasons.push("Below VWAP")
  }

  // MACD momentum
  if (ind.macdHist > 0) bull += 1
  else bear += 1

  // RSI — relaxed extreme zones (not strict 30/70)
  if (ind.rsi <= 40) {
    bull += 2
    reasons.push(`RSI ${ind.rsi.toFixed(0)} — oversold zone`)
  } else if (ind.rsi >= 60) {
    bear += 2
    reasons.push(`RSI ${ind.rsi.toFixed(0)} — overbought zone`)
  } else {
    reasons.push(`RSI ${ind.rsi.toFixed(0)} — neutral`)
  }

  // Proximity detection — near EMA9 or VWAP = higher-quality reversion entry
  const nearEma9 = Math.abs(ind.distToEma9Pct) < 0.08
  const nearVwap = Math.abs(ind.distToVwapPct) < 0.1
  if (nearEma9) reasons.push("Price hugging EMA9 (pullback zone)")
  if (nearVwap) reasons.push("Price near VWAP (mean-reversion zone)")

  const net = bull - bear
  let direction: Direction = "WAIT"
  // Relaxed threshold so it triggers more often
  if (net >= 1.5) direction = "LONG"
  else if (net <= -1.5) direction = "SHORT"

  const confidence = Math.min(
    100,
    Math.round((Math.abs(net) / 7) * 100),
  )

  // Bias for entries/targets even on WAIT — use the leaning side
  const bias: Exclude<Direction, "WAIT"> = net >= 0 ? "LONG" : "SHORT"
  const dir = direction === "WAIT" ? bias : (direction as Exclude<Direction, "WAIT">)

  const entries = buildEntries(price, ind, dir)
  const { stop, targets } = buildTargetsAndStop(price, atrVal, ind, dir, entries)

  // Extension / limit-order logic
  const extended = Math.abs(ind.distToVwapPct) > 0.25 || Math.abs(ind.distToEma9Pct) > 0.18
  const limitOrderHint = buildLimitHint(extended, dir, entries, ind)

  // AI timing
  const { timing, timingScore } = buildTiming(dir, ind, nearEma9, nearVwap, extended, confidence)
  const nextAlert = buildNextAlert(direction, dir, entries, ind)

  return {
    direction,
    price,
    confidence,
    reasons,
    entries,
    stop,
    targets,
    timing,
    timingScore,
    extended,
    limitOrderHint,
    nextAlert,
  }
}

function buildEntries(
  price: number,
  ind: Indicators,
  dir: Exclude<Direction, "WAIT">,
): EntryZone[] {
  const aggressive = price
  const ema9Entry = ind.ema9
  const vwapEntry = ind.vwap
  return [
    {
      label: "Aggressive",
      price: aggressive,
      note: "Market / current price — immediate fill",
    },
    {
      label: "EMA9 Pullback",
      price: ema9Entry,
      note:
        dir === "LONG"
          ? "Buy the dip into EMA9"
          : "Sell the pop into EMA9",
    },
    {
      label: "VWAP Reversion",
      price: vwapEntry,
      note:
        dir === "LONG"
          ? "Deep pullback to VWAP support"
          : "Rally into VWAP resistance",
    },
  ]
}

function buildTargetsAndStop(
  price: number,
  atrVal: number,
  ind: Indicators,
  dir: Exclude<Direction, "WAIT">,
  entries: EntryZone[],
): { stop: number; targets: Target[] } {
  // Reference entry = EMA9 pullback (the "ideal" entry)
  const refEntry = entries[1].price
  const buffer = atrVal * 1.2

  if (dir === "LONG") {
    const stopStruct = Math.min(ind.swingLow, refEntry - buffer)
    const stop = stopStruct
    const risk = Math.max(refEntry - stop, atrVal * 0.5)
    const t1 = refEntry + risk * 1.5
    const t2 = Math.max(refEntry + risk * 3, ind.swingHigh)
    return {
      stop,
      targets: [
        { label: "T1", price: t1, rr: (t1 - refEntry) / risk },
        { label: "T2", price: t2, rr: (t2 - refEntry) / risk },
      ],
    }
  } else {
    const stopStruct = Math.max(ind.swingHigh, refEntry + buffer)
    const stop = stopStruct
    const risk = Math.max(stop - refEntry, atrVal * 0.5)
    const t1 = refEntry - risk * 1.5
    const t2 = Math.min(refEntry - risk * 3, ind.swingLow)
    return {
      stop,
      targets: [
        { label: "T1", price: t1, rr: (refEntry - t1) / risk },
        { label: "T2", price: t2, rr: (refEntry - t2) / risk },
      ],
    }
  }
}

function buildLimitHint(
  extended: boolean,
  dir: Exclude<Direction, "WAIT">,
  entries: EntryZone[],
  ind: Indicators,
): string {
  if (!extended) {
    return "Price not extended — market entry acceptable near current level."
  }
  const target = dir === "LONG" ? entries[1].price : entries[1].price
  const side = dir === "LONG" ? "BUY LIMIT" : "SELL LIMIT"
  const ref = dir === "LONG" ? "EMA9 support" : "EMA9 resistance"
  return `Price extended ${ind.distToVwapPct >= 0 ? "+" : ""}${ind.distToVwapPct.toFixed(
    2,
  )}% from VWAP. Do NOT chase — place ${side} @ ${target.toFixed(2)} (${ref}).`
}

function buildTiming(
  dir: Exclude<Direction, "WAIT">,
  ind: Indicators,
  nearEma9: boolean,
  nearVwap: boolean,
  extended: boolean,
  confidence: number,
): { timing: string; timingScore: number } {
  let score = confidence
  if (nearEma9) score += 15
  if (nearVwap) score += 10
  if (extended) score -= 25
  if ((dir === "LONG" && ind.rsi <= 40) || (dir === "SHORT" && ind.rsi >= 60)) score += 10
  score = Math.max(0, Math.min(100, score))

  let timing: string
  if (score >= 75) {
    timing = `PRIME WINDOW — conditions aligned for ${dir}. Enter now near ideal zone.`
  } else if (score >= 55) {
    timing = `GOOD — ${dir} setup forming. Wait for tag of EMA9 (${ind.ema9.toFixed(2)}).`
  } else if (extended) {
    timing = `HOLD — price extended. Wait for pullback before entering ${dir}.`
  } else {
    timing = `PATIENCE — no clean edge yet. Let price return to VWAP (${ind.vwap.toFixed(2)}).`
  }
  return { timing, timingScore: score }
}

function buildNextAlert(
  direction: Direction,
  dir: Exclude<Direction, "WAIT">,
  entries: EntryZone[],
  ind: Indicators,
): string {
  if (direction !== "WAIT") {
    return `${direction} active — manage toward T1. Next re-entry on EMA9 tag @ ${ind.ema9.toFixed(2)}.`
  }
  const trigger = dir === "LONG" ? "reclaim of VWAP" : "rejection at VWAP"
  return `Watching for ${dir}: trigger on ${trigger} @ ${ind.vwap.toFixed(
    2,
  )} with RSI ${dir === "LONG" ? "<40" : ">60"}. Ideal entry ${entries[1].price.toFixed(2)}.`
}
