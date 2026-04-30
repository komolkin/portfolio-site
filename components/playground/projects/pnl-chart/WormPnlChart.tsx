"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const GREEN = "#1D9E75";
const RED = "#E24B4A";
const WORM_MARKET_IDS = new Set([
  "3keegnn9dGyrH9VtiC6bzmUjEgxiQ8qgj2qmoBzCfV7c",
  "6sKrHGVmiqqAyGzKERdbcbH8qu9j9ng7hgkEHSQdFmA5",
  "35v9bCutMxtAz6q246khtLYFw13YxW3i5ss1BYqMbvPm",
  "273T629MxZz1wDNviAdoEXissDmVsEpR8e8KuW3W9cN6",
  "8svioDMoAaUB1xfsUuLiVkn4H6PXLdR6VW9HRBJGE8Ex",
  "6DQ1KL56c4hucGMijf5BRKN2FWftfJPQmHTWLfccuCkN",
  "7FhZw46X3AYNWqN6vGDxeoek3HBikbViCXFbX2gWquKo",
  "A5Uyv2bB591yrnM6nDnwHGwkByJk9FSjoGcmZWUf6H7D",
  "FnJmeVcq2pBPf8y5Qm84beg2swxLeRNLaH7wT9VW5fP6",
  "HLyhR8iuMeBH7zRL9NNW3p2kK6hXzdmMo6Y4HbJzgNJ2",
  "DEdBYsq7d3R5KabV8uobfbBqWtCcgkypck1M7Dtm99or",
  "9bU4QFftypcZ9pS3FnZPPsbzQvvKAKSn3gQkkxjyi1mG",
  "7ePHotugf7Kyq5SrgH16Ecos4x6eA5n9nsneDzdgajw",
  "F6b57JYLTVZknpdDJqgQZyrmX42Yu8HRbqP4MM75qAcN",
  "8NKUZAwQqgUWMKVCS6Dk5MZxmQXhntHELXoFJ3iB7iBP",
  "AvuvyjB4YJmC3DAcSJxKrh7wkmqX34ukBYjnYrhYBakU",
  "DbA7f4FgxrA5MU65nJgxqeqA6LmhaevaWwi2qzSG9wtt",
  "66LEULguvH1YgrUzzQWmZxwHa7X1vJxaGMCMtJWrTG2h",
  "4octHVhbEnoMjVXH8eZJDMA74sUMHVoDGSkYxJFB8Du3",
  "3ELcJCnkYYWUmGFZNk5hjuiwYmHgCPFLgrQKp1QiHf6h",
]);

interface WormPnlChartProps {
  wallet: string;
  workerUrl: string;
  height?: number;
  refreshKey?: number;
}

interface HeliusTransfer {
  mint?: string;
  fromUserAccount?: string;
  toUserAccount?: string;
  tokenAmount?: number | string;
}

interface HeliusTx {
  timestamp?: number;
  signature?: string;
  type?: string;
  tokenTransfers?: HeliusTransfer[];
  accountData?: Array<{ account?: string }>;
  accountKeys?: string[];
  instructions?: Array<{ programId?: string; accounts?: Array<string | { account?: string }> }>;
}

interface PnlPoint {
  timestamp: number;
  dateLabel: string;
  cumulative: number;
  delta: number;
  signature: string;
}

type Timeframe = "1D" | "1W" | "1M" | "ALL";

function collectTxAccounts(tx: HeliusTx) {
  const accounts = new Set<string>();

  (tx.accountKeys ?? []).forEach((key) => {
    if (typeof key === "string" && key.length > 0) accounts.add(key);
  });

  (tx.accountData ?? []).forEach((entry) => {
    if (entry?.account) accounts.add(entry.account);
  });

  (tx.instructions ?? []).forEach((instruction) => {
    if (instruction?.programId) accounts.add(instruction.programId);
    (instruction?.accounts ?? []).forEach((account) => {
      if (typeof account === "string" && account.length > 0) {
        accounts.add(account);
        return;
      }
      if (account && typeof account === "object" && account.account) {
        accounts.add(account.account);
      }
    });
  });

  return accounts;
}

function isWormMarketTx(tx: HeliusTx) {
  const accounts = collectTxAccounts(tx);
  for (const account of accounts) {
    if (WORM_MARKET_IDS.has(account)) return true;
  }
  return false;
}

function isLikelyTransferTx(tx: HeliusTx) {
  const txType = (tx.type ?? "").toUpperCase();
  return txType.includes("TRANSFER");
}

function formatSignedMoney(value: number, digits = 2) {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${abs.toFixed(digits)}`;
}

function signedParts(value: number) {
  return {
    sign: value >= 0 ? "+" : "-",
    abs: Math.abs(value),
  };
}

function formatDateShort(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function WormPnlChart({
  wallet,
  workerUrl,
  height = 260,
  refreshKey = 0,
}: WormPnlChartProps) {
  const [points, setPoints] = useState<PnlPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [recentFlowsOpen, setRecentFlowsOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("ALL");
  const [signatureToMarketIds, setSignatureToMarketIds] = useState<Record<string, string[]>>({});
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const isEmptyState = points.length === 0;
  const timeframeOptions = ["1D", "1W", "1M", "ALL"] as const;
  const activeTimeframeIndex = timeframeOptions.indexOf(timeframe);

  const visiblePoints = useMemo(() => {
    if (points.length === 0 || timeframe === "ALL") return points;

    const nowSec = Math.floor(Date.now() / 1000);
    const windowSeconds =
      timeframe === "1D"
        ? 24 * 60 * 60
        : timeframe === "1W"
          ? 7 * 24 * 60 * 60
          : 30 * 24 * 60 * 60;
    const cutoff = nowSec - windowSeconds;
    const inWindow = points.filter((point) => point.timestamp >= cutoff);
    const anchorBeforeWindow = [...points]
      .reverse()
      .find((point) => point.timestamp < cutoff);

    if (anchorBeforeWindow) {
      const cutoffAnchor: PnlPoint = {
        ...anchorBeforeWindow,
        timestamp: cutoff,
        dateLabel: formatDateShort(cutoff),
        signature: `${anchorBeforeWindow.signature}-cutoff-anchor`,
        delta: 0,
      };
      // If no events happened in-window, keep a flat in-range segment.
      if (inWindow.length === 0) {
        return [
          cutoffAnchor,
          {
            ...cutoffAnchor,
            timestamp: nowSec,
            dateLabel: formatDateShort(nowSec),
            signature: `${anchorBeforeWindow.signature}-now-anchor`,
          },
        ];
      }
      return [cutoffAnchor, ...inWindow];
    }

    return inWindow;
  }, [points, timeframe]);

  const chartColor = useMemo(() => {
    if (visiblePoints.length === 0) return GREEN;
    return visiblePoints[visiblePoints.length - 1].cumulative >= 0 ? GREEN : RED;
  }, [visiblePoints]);

  const chartSeries = useMemo(() => {
    if (visiblePoints.length === 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      return [
        {
          timestamp: nowSec - 1,
          dateLabel: formatDateShort(nowSec - 1),
          cumulative: 0,
          delta: 0,
          signature: "empty-0",
        },
        {
          timestamp: nowSec,
          dateLabel: formatDateShort(nowSec),
          cumulative: 0,
          delta: 0,
          signature: "empty-1",
        },
      ] satisfies PnlPoint[];
    }
    if (visiblePoints.length > 1) return visiblePoints;
    return [
      visiblePoints[0],
      {
        ...visiblePoints[0],
        signature: `${visiblePoints[0].signature}-flat`,
        timestamp: visiblePoints[0].timestamp + 1,
      },
    ];
  }, [visiblePoints]);

  const chartPath = useMemo(() => {
    if (chartSeries.length === 0) return "";

    const width = 1000;
    const topPadding = 12;
    const bottomPadding = 8;
    const drawHeight = Math.max(height - topPadding - bottomPadding, 1);
    const values = chartSeries.map((point) => point.cumulative);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(maxValue - minValue, 1e-9);

    return chartSeries
      .map((point, index) => {
        const x = (index / Math.max(chartSeries.length - 1, 1)) * width;
        const normalized = (point.cumulative - minValue) / range;
        const y = topPadding + (1 - normalized) * drawHeight;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [chartSeries, height]);

  const hoveredPoint = useMemo(() => {
    if (hoveredIndex === null) return null;
    if (chartSeries.length === 0) return null;
    return chartSeries[Math.max(0, Math.min(chartSeries.length - 1, hoveredIndex))];
  }, [chartSeries, hoveredIndex]);

  const hoveredX = useMemo(() => {
    if (hoveredIndex === null || chartSeries.length < 2) return null;
    const width = 1000;
    return (hoveredIndex / (chartSeries.length - 1)) * width;
  }, [chartSeries.length, hoveredIndex]);

  const headerLabel = hoveredPoint
    ? formatDateShort(hoveredPoint.timestamp)
    : "Total PnL";

  const stats = useMemo(() => {
    const deltas = visiblePoints.map((point) => point.delta);
    const totalPnl =
      visiblePoints.length > 0
        ? visiblePoints[visiblePoints.length - 1].cumulative
        : 0;
    const biggestWin = deltas.reduce(
      (max, delta) => (delta > max ? delta : max),
      0,
    );
    const buyPoints = visiblePoints.filter((point) => point.delta < -0.001);
    const trailingOpenBuyPoints: PnlPoint[] = [];
    for (let i = visiblePoints.length - 1; i >= 0; i -= 1) {
      const point = visiblePoints[i];
      if (point.delta < -0.001) {
        trailingOpenBuyPoints.push(point);
        continue;
      }
      break;
    }
    const inPositions = Math.abs(
      trailingOpenBuyPoints.reduce((sum, point) => sum + point.delta, 0),
    );
    const predictions = new Set<string>();
    let attributedBuyPoints = 0;
    buyPoints.forEach((point) => {
      const marketIds = signatureToMarketIds[point.signature] ?? [];
      if (marketIds.length > 0) {
        attributedBuyPoints += 1;
        marketIds.forEach((marketId) => predictions.add(marketId));
      }
    });
    // Fallback when worker payload lacks Worm account attribution data.
    // Buy-side only: exclude redeem/liquidation-like positive-delta flows.
    const predictionsCount =
      predictions.size > 0 || attributedBuyPoints > 0
        ? predictions.size
        : new Set(buyPoints.map((point) => point.signature)).size;
    return {
      totalPnl,
      predictionsCount,
      biggestWin,
      inPositions,
    };
  }, [signatureToMarketIds, visiblePoints]);

  const headerValueRaw = hoveredPoint ? hoveredPoint.cumulative : stats.totalPnl;
  const headerValueParts = signedParts(headerValueRaw);
  const headerValueClassName = headerValueRaw >= 0 ? "text-[#1D9E75]" : "text-[#E24B4A]";
  const biggestWinParts = signedParts(stats.biggestWin);

  const fetchData = useCallback(async (signal: AbortSignal) => {
    const normalizedWorkerUrl = workerUrl.replace(/\/+$/, "");
    const normalizedWallet = wallet.trim();
    const allTransactions: HeliusTx[] = [];
    let before: string | null = null;

    for (let page = 0; page < 3; page += 1) {
      const params = new URLSearchParams({ limit: "100" });
      if (before) params.set("before", before);
      const url = `${normalizedWorkerUrl}/txs/${encodeURIComponent(normalizedWallet)}?${params.toString()}`;

      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions (${response.status})`);
      }

      const batch = (await response.json()) as HeliusTx[];
      if (!Array.isArray(batch)) {
        throw new Error("Unexpected response format from worker");
      }

      allTransactions.push(...batch);
      if (batch.length < 100) break;

      const lastSignature = batch[batch.length - 1]?.signature;
      if (!lastSignature) break;
      before = lastSignature;
    }

    const wormAttributedTransactions = allTransactions.filter(isWormMarketTx);
    const nonTransferTransactions = allTransactions.filter((tx) => !isLikelyTransferTx(tx));
    const wormNonTransferTransactions = wormAttributedTransactions.filter(
      (tx) => !isLikelyTransferTx(tx),
    );

    // Preference order:
    // 1) Worm-attributed + non-transfer (best signal)
    // 2) Any non-transfer txs
    // 3) Raw transactions (never blank chart due to strict filtering)
    const sourceTransactions =
      wormNonTransferTransactions.length > 0
        ? wormNonTransferTransactions
        : nonTransferTransactions.length > 0
          ? nonTransferTransactions
          : allTransactions;
    const nextSignatureToMarketIds: Record<string, string[]> = {};
    sourceTransactions.forEach((tx) => {
      const signature = tx.signature ?? "";
      if (!signature) return;
      const marketIds = Array.from(collectTxAccounts(tx)).filter((account) =>
        WORM_MARKET_IDS.has(account),
      );
      nextSignatureToMarketIds[signature] = marketIds;
    });

    const flows = sourceTransactions
      .map((tx) => {
        const transfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
        const delta = transfers.reduce((acc, transfer) => {
          if (transfer.mint !== USDC_MINT) return acc;
          const amount = Number(transfer.tokenAmount ?? 0);
          if (!Number.isFinite(amount) || amount === 0) return acc;
          if (transfer.toUserAccount === normalizedWallet) return acc + amount;
          if (transfer.fromUserAccount === normalizedWallet) return acc - amount;
          return acc;
        }, 0);

        return {
          timestamp: Number(tx.timestamp ?? 0),
          signature: tx.signature ?? "",
          delta,
        };
      })
      .filter((flow) => Number.isFinite(flow.timestamp) && flow.timestamp > 0 && flow.signature)
      .filter((flow) => Math.abs(flow.delta) >= 0.001)
      .sort((a, b) => a.timestamp - b.timestamp);

    let running = 0;
    const cumulativePoints: PnlPoint[] = flows.map((flow) => {
      running += flow.delta;
      return {
        timestamp: flow.timestamp,
        signature: flow.signature,
        delta: flow.delta,
        cumulative: running,
        dateLabel: formatDateShort(flow.timestamp),
      };
    });

    setPoints(cumulativePoints);
    setSignatureToMarketIds(nextSignatureToMarketIds);
  }, [wallet, workerUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchData(controller.signal);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to load PnL data";
        setError(message);
        setPoints([]);
        setSignatureToMarketIds({});
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    run();
    return () => controller.abort();
  }, [fetchData, refreshNonce, refreshKey]);

  useEffect(() => {
    if (loading) {
      setIsRevealed(false);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      setIsRevealed(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [loading]);

  if (loading) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-[20px] p-5 text-xs text-muted-foreground"
        style={{ background: "#1d1d1d", minHeight: height + 220 }}
      >
        Loading chart data...
      </div>
    );
  }

  const recentFlows = [...visiblePoints]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 30);

  return (
    <div
      className={`flex w-full flex-col gap-5 rounded-[20px] bg-white/[0.04] p-5 transition-all duration-500 ease-out ${
        isRevealed ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
      }`}
      style={{ background: "#1d1d1d" }}
    >
      <div className="flex items-start justify-between">
        <div className="font-mono">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">{headerLabel}</p>
          <p className={`mt-1 text-[40px] leading-[1.1] tabular-nums font-mono ${headerValueClassName}`}>
            <span>{headerValueParts.sign}$</span>
            <NumberFlow
              value={headerValueParts.abs}
              trend={0}
              format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              className="text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
          </p>
        </div>
        <div className="relative inline-flex items-center rounded-full p-1">
          <span
            className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-white/10 backdrop-blur-[5px] transition-transform duration-300 ease-out"
            style={{
              left: "4px",
              width: "calc((100% - 8px) / 4)",
              transform: `translateX(${activeTimeframeIndex * 100}%)`,
            }}
          />
          {timeframeOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTimeframe(option)}
              className={`relative z-10 w-10 rounded-full px-2 py-1 text-xs transition-colors duration-200 ${
                timeframe === option
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option === "ALL" ? "All" : option}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{ height }}
        className="relative"
        onMouseMove={(event) => {
          const target = event.currentTarget.getBoundingClientRect();
          if (target.width <= 0 || chartSeries.length === 0 || isEmptyState) return;
          const relativeX = Math.min(Math.max(event.clientX - target.left, 0), target.width);
          const ratio = relativeX / target.width;
          const idx = Math.round(ratio * (chartSeries.length - 1));
          setHoveredIndex(idx);
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <svg
          viewBox={`0 0 1000 ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-label="PnL chart"
        >
          {hoveredX !== null && !isEmptyState && (
            <line
              x1={hoveredX}
              x2={hoveredX}
              y1={0}
              y2={height}
              stroke="rgba(255,255,255,0.28)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )}
          <path
            d={chartPath}
            fill="none"
            stroke={chartColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {isEmptyState && (
          <p className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 text-center text-xs text-muted-foreground">
            No transactions found
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 font-mono">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">In positions</p>
          <p className="mt-1 text-[24px] leading-[1.1] text-foreground tabular-nums font-mono">
            <span>$</span>
            <NumberFlow
              value={stats.inPositions}
              trend={0}
              format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              className="text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Biggest win</p>
          <p className="mt-1 text-[24px] leading-[1.1] text-foreground tabular-nums font-mono">
            <span>$</span>
            <NumberFlow
              value={biggestWinParts.abs}
              trend={0}
              format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              className="text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Predictions</p>
          <p className="mt-1 text-[24px] leading-[1.1] text-foreground tabular-nums font-mono">
            <NumberFlow
              value={stats.predictionsCount}
              trend={0}
              format={{ useGrouping: false, maximumFractionDigits: 0 }}
              className="text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.03] p-3">
        <button
          type="button"
          onClick={() => setRecentFlowsOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left transition-colors duration-200"
          aria-expanded={recentFlowsOpen}
        >
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Recent Transactions</span>
          <span className="text-xs text-muted-foreground">{recentFlowsOpen ? "Hide" : "Show"}</span>
        </button>
        <div
          className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out ${
            recentFlowsOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {recentFlows.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recent transactions</p>
              ) : (
                recentFlows.map((flow) => (
                  <div key={flow.signature} className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-sm">
                    <span className="text-muted-foreground">{formatDateShort(flow.timestamp)}</span>
                    <span className={`tabular-nums ${flow.delta >= 0 ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}>
                      {formatSignedMoney(flow.delta)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
