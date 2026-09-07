import type { Candle } from "./types"

// Gold is not a Binance spot pair as "XAUUSD". PAXG/USDT is the tokenized-gold
// proxy that tracks spot gold 1:1 and is the standard Binance gold market.
export const SYMBOL = "PAXGUSDT"
export const DISPLAY_SYMBOL = "XAU/USDT"
export const INTERVAL = "1m"

const REST = "https://api.binance.com/api/v3"
const WS = "wss://stream.binance.com:9443/ws"

interface RawKline {
  0: number // open time
  1: string // open
  2: string // high
  3: string // low
  4: string // close
  5: string // volume
}

export async function fetchKlines(limit = 200): Promise<Candle[]> {
  const url = `${REST}/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=${limit}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`klines ${res.status}`)
  const raw: RawKline[] = await res.json()
  return raw.map((k) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }))
}

export interface Ticker24h {
  changePct: number
  high: number
  low: number
  volume: number
}

export async function fetch24h(): Promise<Ticker24h> {
  const res = await fetch(`${REST}/ticker/24hr?symbol=${SYMBOL}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`24h ${res.status}`)
  const d = await res.json()
  return {
    changePct: parseFloat(d.priceChangePercent),
    high: parseFloat(d.highPrice),
    low: parseFloat(d.lowPrice),
    volume: parseFloat(d.volume),
  }
}

export type KlineUpdate = {
  candle: Candle
  isFinal: boolean
}

// Live kline websocket. Returns a cleanup function.
export function subscribeKlines(
  onUpdate: (u: KlineUpdate) => void,
  onError: () => void,
): () => void {
  let ws: WebSocket | null = null
  let closed = false
  try {
    ws = new WebSocket(`${WS}/${SYMBOL.toLowerCase()}@kline_${INTERVAL}`)
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        const k = msg.k
        if (!k) return
        onUpdate({
          candle: {
            time: k.t,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          },
          isFinal: k.x,
        })
      } catch {
        /* ignore malformed frame */
      }
    }
    ws.onerror = () => {
      if (!closed) onError()
    }
    ws.onclose = () => {
      if (!closed) onError()
    }
  } catch {
    onError()
  }
  return () => {
    closed = true
    ws?.close()
  }
}
