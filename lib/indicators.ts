import type { Candle } from "./types"

export function ema(values: number[], period: number): number[] {
  if (values.length === 0) return []
  const k = 2 / (period + 1)
  const out: number[] = []
  let prev = values[0]
  out.push(prev)
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    out.push(prev)
  }
  return out
}

export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function atr(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]
    const prev = candles[i - 1]
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close),
    )
    trs.push(tr)
  }
  const slice = trs.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

// Session VWAP over the provided candle window
export function vwap(candles: Candle[]): number {
  let pv = 0
  let vol = 0
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3
    pv += typical * c.volume
    vol += c.volume
  }
  return vol > 0 ? pv / vol : candles.at(-1)?.close ?? 0
}

export function macd(closes: number[]): { macd: number; signal: number; hist: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, hist: 0 }
  const ema12 = ema(closes, 12)
  const ema26 = ema(closes, 26)
  const macdLine: number[] = []
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i])
  }
  const signalLine = ema(macdLine, 9)
  const m = macdLine.at(-1) ?? 0
  const s = signalLine.at(-1) ?? 0
  return { macd: m, signal: s, hist: m - s }
}

// Recent swing high/low using a simple pivot window
export function swingLevels(
  candles: Candle[],
  lookback = 30,
): { high: number; low: number } {
  const slice = candles.slice(-lookback)
  if (slice.length === 0) return { high: 0, low: 0 }
  let high = -Infinity
  let low = Infinity
  for (const c of slice) {
    if (c.high > high) high = c.high
    if (c.low < low) low = c.low
  }
  return { high, low }
}
