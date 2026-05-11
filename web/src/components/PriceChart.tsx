"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingDown, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

import { PriceAlertModal } from "./PriceAlertModal";

interface PriceDataPoint {
  date: string;
  price: number;
}

interface PriceChartProps {
  productId: string;
  data: PriceDataPoint[];
  currentPrice: number;
  originalPrice: number | null;
  productName: string;
}

export function PriceChart({ productId, data, currentPrice, originalPrice, productName }: PriceChartProps) {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);
  // Mock data if pure DB fetch didn't return enough historical points
  const displayData = data.length > 2 ? data : [
    { date: "Jan 10", price: currentPrice * 1.2 },
    { date: "Jan 18", price: currentPrice * 1.1 },
    { date: "Feb 02", price: currentPrice * 1.15 },
    { date: "Feb 15", price: currentPrice * 1.05 },
    { date: "Mar 01", price: currentPrice * 1.0 },
    { date: "Today", price: currentPrice },
  ];

  const lowestPrice = Math.min(...displayData.map((d) => d.price));
  const highestPrice = Math.max(...displayData.map((d) => d.price));
  const isGoodDeal = currentPrice <= lowestPrice * 1.05;

  return (
    <div className="nm-raised rounded-xl p-6 overflow-hidden relative group">
      {/* Background glow */}
      <div className="absolute -inset-2bg-primary/20 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none" />

      <div className="flex flex-col md:flex-row justify-between mb-8 gap-4 relative z-10">
        <div>
          <h2 className="text-xl font-medium text-white/90 mb-1 line-clamp-1">{productName}</h2>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Clock className="w-4 h-4" />
            <span>Price tracked over time</span>
          </div>
        </div>

        <div className="flex items-end gap-3 shrink-0">
          <div className="text-right">
            <p className="text-3xl font-bold text-white mb-0.5">
              ৳{currentPrice.toLocaleString("en-IN")}
            </p>
            {originalPrice && originalPrice > currentPrice && (
              <p className="text-sm text-white/40 line-through">
                ৳{originalPrice.toLocaleString("en-IN")}
              </p>
            )}
          </div>
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 mb-2",
              isGoodDeal
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            )}
          >
            {isGoodDeal ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            {isGoodDeal ? "Good Time To Buy" : "Wait For Drop"}
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full -ml-4">
        {mounted ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `৳${(value / 1000).toFixed(1)}k`}
                domain={[lowestPrice * 0.9, highestPrice * 1.1]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(20, 20, 25, 0.9)",
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "rgba(255,255,255,0.6)", marginBottom: "4px" }}
                formatter={(value) => [`৳${Number(value ?? 0).toLocaleString("en-IN")}`, "Price"]}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#a78bfa"
                strokeWidth={3}
                dot={{ fill: "#a78bfa", strokeWidth: 2, r: 4, stroke: "#18181b" }}
                activeDot={{ r: 6, strokeWidth: 0, fill: "#fff" }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/10">
            Loading Chart...
          </div>
        )}
      </div>
      
      {/* Alert Setting Banner */}
      <div className="mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/90">Set Price Alert</p>
            <p className="text-xs text-white/50">Get notified when this drops below ৳{(currentPrice * 0.9).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors w-full sm:w-auto"
        >
          Create Alert
        </button>
      </div>

      <PriceAlertModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={productId}
        productName={productName}
        currentPrice={currentPrice}
      />
    </div>
  );
}
