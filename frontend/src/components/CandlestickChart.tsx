"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";

export type ChartType = "candlestick" | "line" | "area" | "bar";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandlestickChartProps {
  candles: Candle[];
  type?: ChartType;
}

export default function CandlestickChart({ candles, type = "candlestick" }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<any>(null);

  // ── Create chart once ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#e9ecef" },
        textColor:  "#00045e",
      },
      grid: {
        vertLines: { color: "#d1d5db" },
        horzLines: { color: "#d1d5db" },
      },
      rightPriceScale: {
        borderColor: "transparent",
        textColor:   "#00045e",
      },
      timeScale: {
        borderColor:        "transparent",
        timeVisible:        true,
        secondsVisible:     false,
        tickMarkFormatter: (time: number) => {
          const d = new Date(time * 1000);
          return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },
      },
      crosshair: {
        mode: 1,
      },
      handleScroll:   true,
      handleScale:    true,
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    let series;
    if (type === "line") {
      series = chart.addSeries(LineSeries, {
        color: "#26c238",
        lineWidth: 2,
      });
    } else if (type === "area") {
      series = chart.addSeries(AreaSeries, {
        lineColor: "#26c238",
        topColor: "rgba(38, 194, 56, 0.4)",
        bottomColor: "rgba(38, 194, 56, 0.0)",
        lineWidth: 2,
      });
    } else if (type === "bar") {
      series = chart.addSeries(BarSeries, {
        upColor:       "#26c238",
        downColor:     "#ef4444",
      });
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor:       "#26c238",
        downColor:     "#ef4444",
        borderVisible: false,
        wickUpColor:   "#26c238",
        wickDownColor: "#ef4444",
      });
    }

    chartRef.current  = chart;
    seriesRef.current = series;

    // Resize observer to keep the chart filling its container
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [type]);

  // ── Feed / update candle data ──────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    // Deduplicate by time (keep last occurrence) then sort ascending
    const map = new Map<number, Candle>();
    for (const c of candles) map.set(c.time, c);
    const sorted = Array.from(map.values())
      .sort((a, b) => a.time - b.time)
      .map((c) => ({ ...c, time: c.time as UTCTimestamp }));

    if (type === "line" || type === "area") {
      const formattedData = sorted.map(c => ({ time: c.time, value: c.close }));
      seriesRef.current.setData(formattedData);
    } else {
      seriesRef.current.setData(sorted);
    }
    
    // Fit all candles from left to right
    chartRef.current?.timeScale().fitContent();
  }, [candles, type]);

  return <div ref={containerRef} className="w-full h-full" />;
}
