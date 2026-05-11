"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

export interface TrendPoint {
  label: string;
  current: number | null;
  prior: number | null;
}

export interface TrendSeries {
  points: TrendPoint[];
  currentTotal: number;
  priorTotal: number;
  deltaPercent: number | null;
}

export interface TrendsResponse {
  week: TrendSeries;
  month: TrendSeries;
  year: TrendSeries;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
        <Minus className="h-3 w-3" />
        No prior data
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={
        positive
          ? "inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
          : "inline-flex items-center gap-1 text-[11px] font-semibold text-accent-600 dark:text-accent-400"
      }
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {positive ? "+" : ""}
      {delta}%
    </span>
  );
}

export function TrendChart({
  title,
  currentLabel,
  priorLabel,
  series,
}: {
  title: string;
  currentLabel: string;
  priorLabel: string;
  series: TrendSeries;
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-none mt-2">
              {series.currentTotal}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              vs {series.priorTotal} prior
            </p>
          </div>
          <DeltaBadge delta={series.deltaPercent} />
        </div>

        <div className="h-[160px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series.points}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-gray-200 dark:text-brand-700"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-gray-500 dark:text-gray-400"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-gray-500 dark:text-gray-400"
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid rgb(229 231 235)",
                  background: "rgb(255 255 255)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
                labelStyle={{ color: "#111827", fontWeight: 600 }}
                formatter={(value, name) => [
                  value == null ? "—" : (value as number),
                  name === "current" ? currentLabel : priorLabel,
                ]}
              />
              <Line
                type="monotone"
                dataKey="prior"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#c4333b"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="block w-3 h-0.5 bg-accent-500 rounded-full" />
            <span className="text-gray-700 dark:text-gray-200">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="block w-3 h-0.5 border-t-2 border-dashed border-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{priorLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendChartsRow({ trends }: { trends: TrendsResponse }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <TrendChart
        title="This week vs last week"
        currentLabel="This week"
        priorLabel="Last week"
        series={trends.week}
      />
      <TrendChart
        title="This month vs last month"
        currentLabel="This month"
        priorLabel="Last month"
        series={trends.month}
      />
      <TrendChart
        title="This year vs last year"
        currentLabel="This year"
        priorLabel="Last year"
        series={trends.year}
      />
    </div>
  );
}
