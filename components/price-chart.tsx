"use client"

import { useEffect, useRef } from "react"
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  LineStyle,
  type IPriceLine,
} from "lightweight-charts"
import type { MarketSnapshot } from "@/lib/types"

export function PriceChart({ snap }: { snap: MarketSnapshot | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const ema9Series = useRef<ISeriesApi<"Line"> | null>(null)
  const vwapSeries = useRef<ISeriesApi<"Line"> | null>(null)
  const priceLines = useRef<IPriceLine[]>([])

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8a8f98",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      handleScale: false,
      handleScroll: false,
    })
    chartRef.current = chart

    candleSeries.current = chart.addCandlestickSeries({
      upColor: "#2ec16b",
      downColor: "#e0503b",
      borderUpColor: "#2ec16b",
      borderDownColor: "#e0503b",
      wickUpColor: "#2ec16b",
      wickDownColor: "#e0503b",
    })
    ema9Series.current = chart.addLineSeries({
      color: "#e0a83b",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    vwapSeries.current = chart.addLineSeries({
      color: "#4a9fd4",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [])

  // data + EMA9/VWAP lines
  useEffect(() => {
    if (!snap || !candleSeries.current) return
    const candleData: CandlestickData[] = snap.candles.map((c) => ({
      time: (c.time / 1000) as CandlestickData["time"],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
    candleSeries.current.setData(candleData)

    // Recompute rolling EMA9 & VWAP series across the window for the overlays
    const ema9Line: LineData[] = []
    const vwapLine: LineData[] = []
    let ema9 = snap.candles[0]?.close ?? 0
    const k = 2 / (9 + 1)
    let pv = 0
    let vol = 0
    snap.candles.forEach((c, i) => {
      ema9 = i === 0 ? c.close : c.close * k + ema9 * (1 - k)
      const typical = (c.high + c.low + c.close) / 3
      pv += typical * c.volume
      vol += c.volume
      const t = (c.time / 1000) as LineData["time"]
      ema9Line.push({ time: t, value: ema9 })
      vwapLine.push({ time: t, value: vol ? pv / vol : c.close })
    })
    ema9Series.current?.setData(ema9Line)
    vwapSeries.current?.setData(vwapLine)
  }, [snap])

  // signal price lines (entries / stop / targets)
  useEffect(() => {
    if (!snap || !candleSeries.current) return
    priceLines.current.forEach((pl) => candleSeries.current?.removePriceLine(pl))
    priceLines.current = []
    const s = snap.signal
    const add = (price: number, color: string, title: string, style = LineStyle.Solid) => {
      const pl = candleSeries.current!.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: style,
        axisLabelVisible: true,
        title,
      })
      priceLines.current.push(pl)
    }
    add(s.entries[1].price, "#e0a83b", "IDEAL", LineStyle.Dotted)
    add(s.stop, "#e0503b", "SL")
    add(s.targets[0].price, "#2ec16b", "T1", LineStyle.Dashed)
    add(s.targets[1].price, "#2ec16b", "T2", LineStyle.Dashed)
  }, [snap])

  return <div ref={containerRef} className="h-full w-full" />
}
