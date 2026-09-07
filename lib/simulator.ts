import type { Candle } from "./types"

// Realistic random-walk fallback used only when Binance is unreachable, so the
// terminal always animates in preview. Seeded around a gold-like price.
export function seedCandles(count = 200, start = 2650): Candle[] {
  const candles: Candle[] = []
  let price = start
  const now = Date.now()
  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * 60_000
    const drift = (Math.random() - 0.5) * 3
    const open = price
    const close = Math.max(1, open + drift)
    const high = Math.max(open, close) + Math.random() * 1.5
    const low = Math.min(open, close) - Math.random() * 1.5
    const volume = 50 + Math.random() * 300
    candles.push({ time, open, high, low, close, volume })
    price = close
  }
  return candles
}

// Advance the last candle / roll a new one.
export function tickSimulated(candles: Candle[]): { candle: Candle; isFinal: boolean } {
  const last = candles.at(-1)!
  const now = Date.now()
  const minuteStart = Math.floor(now / 60_000) * 60_000
  const drift = (Math.random() - 0.5) * 1.4
  if (minuteStart > last.time) {
    const open = last.close
    const close = open + drift
    return {
      candle: {
        time: minuteStart,
        open,
        high: Math.max(open, close),
        low: Math.min(open, close),
        close,
        volume: 40 + Math.random() * 120,
      },
      isFinal: false,
    }
  }
  const close = last.close + drift
  return {
    candle: {
      ...last,
      close,
      high: Math.max(last.high, close),
      low: Math.min(last.low, close),
      volume: last.volume + Math.random() * 5,
    },
    isFinal: false,
  }
}
