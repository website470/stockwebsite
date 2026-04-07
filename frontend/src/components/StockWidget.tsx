"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Lazy-load the chart (it uses browser APIs — not SSR safe)
const CandlestickChart = dynamic(() => import("./CandlestickChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-[#00045e] font-semibold opacity-50">
      Loading chart…
    </div>
  ),
});

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface StockData {
  symbol: string;
  currentPrice: number;
  changeAbsolute: number;
  changePercent: number;
  openPrice: number;
  allTimeHigh?: number;
  lastUpdateTime?: string;
  history: Candle[];
}

function generateSyntheticHistory(startPrice: number, endPrice: number, steps: number = 60): Candle[] {
  const history: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  const stepTime = 60; // 1 minute per step

  let currentVal = startPrice;
  const totalChange = endPrice - startPrice;
  // A simple linear trend + small noise
  const trendPerStep = totalChange / steps;

  for (let i = 0; i <= steps; i++) {
    // We add pseudo-random noise but keep the trend directed towards endPrice
    const noise = (Math.random() - 0.5) * (Math.abs(totalChange) * 0.15);
    let nextVal = currentVal + trendPerStep + noise;

    // Ensure the last step hits the target exactly
    if (i === steps) {
      nextVal = endPrice;
    }

    const open = currentVal;
    const close = nextVal;

    // Wicks
    const high = Math.max(open, close) + Math.abs(open - close) * Math.random();
    const low = Math.min(open, close) - Math.abs(open - close) * Math.random();

    history.push({
      time: now - (steps - i) * stepTime,
      open,
      high,
      low,
      close
    });

    currentVal = nextVal;
  }

  return history;
}

export default function StockWidget() {
  const [chartType, setChartType] = useState<"candlestick" | "line" | "area" | "bar">("candlestick");
  const [data, setData] = useState<StockData>({
    symbol: "CONNPLEX",
    currentPrice: 200.0,
    changeAbsolute: 0,
    changePercent: 0,
    openPrice: 200.0,
    lastUpdateTime: '',
    history: [],
  } as StockData & { lastUpdateTime?: string });

  useEffect(() => {
    let currentHistory: Candle[] = []; // Local mutable copy for the interval closure

    const fetchData = async () => {
      try {
        const res = await fetch("/api/stock/connplex");
        if (res.ok) {
          const json = await res.json();
          if (json.priceInfo) {
            const newPrice = json.priceInfo.lastPrice;
            const allTimeHigh = json.priceInfo.upperCP;
            console.log("alltimehigh", allTimeHigh);

            if (currentHistory.length === 0) {
              // Generate baseline history starting from 186.25 up to current newPrice
              currentHistory = generateSyntheticHistory(186.25, newPrice, 100);
            } else {
              // If we already have history, just append the new live data point
              const lastPoint = currentHistory[currentHistory.length - 1];
              // Avoid duplicates if price/time is unchanged. Adding new point for demonstration.
              const nowTime = Math.floor(Date.now() / 1000);
              if (nowTime > lastPoint.time) {
                const open = lastPoint.close;
                const close = newPrice;
                const high = Math.max(open, close) + Math.abs(open - close) * 0.1;
                const low = Math.min(open, close) - Math.abs(open - close) * 0.1;

                currentHistory = [...currentHistory, {
                  time: nowTime,
                  open,
                  high,
                  low,
                  close
                }];
              }
            }

            setData({
              symbol: json.metadata?.symbol || "CONNPLEX",
              currentPrice: newPrice,
              changeAbsolute: json.priceInfo.change,
              changePercent: json.priceInfo.pChange,
              openPrice: json.priceInfo.open,
              allTimeHigh: json.priceInfo.weekHighLow?.max,
              lastUpdateTime: json.metadata?.lastUpdateTime || '',
              history: currentHistory,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching stock data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Polling every 5s instead of 2s for real API
    return () => clearInterval(interval);
  }, []);

  const isPositive = data.changeAbsolute >= 0;

  return (
    /* Full-screen container */
    <div className="w-full h-screen flex flex-col overflow-hidden font-sans bg-white">

      {/* ── Header ── */}
      <div
        className="bg-[#000000] text-[#D4AF37] shrink-0
                   px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5
                   lg:px-12 lg:py-6 xl:px-16 xl:py-8 2xl:px-20 2xl:py-10
                   flex items-center justify-between"
      >
        <h1
          className="font-extrabold tracking-wide leading-tight
                     text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl"
        >
          CONNPLEX CINEMAS LTD
        </h1>
      </div>

      {/* ── Price Row ── */}
      <div
        className="shrink-0 bg-white border-b-2 border-slate-100
                   px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5
                   lg:px-12 lg:py-6 xl:px-16 xl:py-8 2xl:px-20 2xl:py-10
                   flex flex-wrap items-baseline gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6"
      >
        {/* Current price */}
        <span
          className="font-black text-[#00045e]
                     text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl"
        >
          {data.currentPrice.toFixed(2)}
        </span>

        {/* Absolute change */}
        <span
          className="font-bold text-[#00045e]
                     text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl"
        >
          {isPositive ? "+" : ""}
          {data.changeAbsolute.toFixed(2)}
        </span>

        {/* Percent + arrow */}
        <div
          className={`flex items-center font-bold px-3 py-1 rounded-lg
                      text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl
                      ${isPositive ? "text-[#26c238] bg-[#26c238]/10" : "text-red-500 bg-red-500/10"}`}
        >
          <span>
            {isPositive ? "+" : ""}
            {data.changePercent.toFixed(2)}%
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`ml-1 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16
                        ${isPositive ? "rotate-180" : ""}`}
            style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" }}
          >
            <path d="M12 21l-12-18h24z" />
          </svg>
        </div>
      </div>

      {/* ── Sub Price Row (Open & Last Price) ── */}
      <div
        className="shrink-0 bg-slate-50 border-b-2 border-slate-200
                   px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-3
                   lg:px-12 lg:py-4 xl:px-16 xl:py-4 2xl:px-20 2xl:py-5
                   flex flex-wrap items-center gap-6 sm:gap-8 md:gap-10
                   text-[#00045e] font-semibold
                   text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl"
      >
        <div className="flex items-center">
          <span className="opacity-70 mr-2 uppercase tracking-wide text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl">Starting Price</span>
          <span className="font-bold">186.25</span>
        </div>
        <div className="flex items-center">
          <span className="opacity-70 mr-2 uppercase tracking-wide text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl">Open</span>
          <span className="font-bold">{data.openPrice?.toFixed(2) || "---"}</span>
        </div>
        <div className="flex items-center">
          <span className="opacity-70 mr-2 uppercase tracking-wide text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl">Last</span>
          <span className="font-bold">{data.currentPrice?.toFixed(2) || "---"}</span>
        </div>
        <div className="flex items-center">
          <span className="opacity-70 mr-2 uppercase tracking-wide text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl">All Time High</span>
          <span className="font-bold whitespace-nowrap">{data.allTimeHigh?.toFixed(2) || "---"}</span>
        </div>
      </div>

      {/* ── Candlestick Chart — fills remaining screen height ── */}
      <div className="relative flex-1 flex flex-col min-h-0 bg-[#e9ecef]">

        {/* Controls Overlay */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <div className="relative inline-block">
            <select
              title="Chart Type"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="appearance-none pl-4 pr-10 py-2 sm:py-3 border-2 border-[#00045e]/10 rounded-full shadow-sm bg-white/90 backdrop-blur-sm text-[#00045e] font-bold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-[#00045e]/20 transition-all cursor-pointer"
            >
              <option value="candlestick">Candlestick</option>
              <option value="line">Line Graph</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#00045e]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Last Updated badge */}
        {/* <div className="absolute top-2 right-6
                        sm:top-3 sm:right-10
                        md:top-4 md:right-14
                        lg:top-5 lg:right-20
                        xl:top-6 xl:right-24
                        bg-[#3e6b00] text-white font-bold z-10
                        px-2 py-1 sm:px-3 sm:py-1 md:px-4 md:py-2
                        text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
          {data.lastUpdateTime ? `Last Updated: ${data.lastUpdateTime}` : 'INTRA DAY'}
        </div> */}

        {/* Chart fills all vertical space */}
        <div className="flex-1 min-h-0 pt-16 pb-2 px-1
                        sm:pt-20 sm:pb-2 sm:px-2
                        md:pt-20 md:px-3
                        lg:pt-20 lg:px-4
                        xl:pt-20 xl:px-6
                        2xl:pt-20 2xl:px-8">
          <CandlestickChart candles={data.history} type={chartType} />
        </div>
      </div>
    </div>
  );
}
