export interface Candle {
  time: number // ms epoch
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Direction = "LONG" | "SHORT" | "WAIT"

export interface EntryZone {
  label: string // "Aggressive" | "EMA9 Pullback" | "VWAP Reversion"
  price: number
  note: string
}

export interface Target {
  label: string // "T1" | "T2"
  price: number
  rr: number // reward:risk ratio
}

export interface Indicators {
  ema9: number
  ema21: number
  ema50: number
  vwap: number
  rsi: number
  atr: number
  macd: number
  macdSignal: number
  macdHist: number
  distToEma9Pct: number // signed % distance from price to EMA9
  distToVwapPct: number // signed % distance from price to VWAP
  distToEma9Abs: number
  distToVwapAbs: number
  swingHigh: number
  swingLow: number
}

export interface Signal {
  direction: Direction
  price: number
  confidence: number // 0-100
  reasons: string[]
  entries: EntryZone[]
  stop: number
  targets: Target[]
  // AI assistance
  timing: string // best time to enter guidance
  timingScore: number // 0-100, how ideal right now
  extended: boolean // price extended from mean
  limitOrderHint: string // where to place a limit if extended
  nextAlert: string // next trade alert forecast
}

export interface ActiveTrade {
  id: string
  direction: Exclude<Direction, "WAIT">
  entry: number
  stop: number
  targets: Target[]
  openedAt: number
  entryLabel: string
}

export type TradeOutcome = "TP1" | "TP2" | "SL" | "OPEN"

export interface ClosedTrade extends ActiveTrade {
  closedAt: number
  exit: number
  outcome: TradeOutcome
  pnlR: number // in R multiples
}

export interface MarketSnapshot {
  symbol: string
  price: number
  prevPrice: number
  changePct24h: number
  high24h: number
  low24h: number
  volume24h: number
  candles: Candle[]
  indicators: Indicators
  signal: Signal
  connected: boolean
  live: boolean // true if from Binance, false if simulated fallback
  updatedAt: number
}
