"use client";

import { formatCurrency, formatCompact } from "@/lib/format";

export default function FundingProgress({
  targetRaise,
  totalCommitted,
  investorCount,
  compact,
}: {
  targetRaise: number | null;
  totalCommitted: number;
  investorCount?: number;
  compact?: boolean;
}) {
  if (!targetRaise) return null;

  const pct = Math.min(Math.round((totalCommitted / targetRaise) * 100), 100);

  if (compact) {
    return (
      <div className="mt-3 space-y-1">
        <div className="h-1.5 rounded-full bg-[--bg-input] overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-500"
            style={{ width: `${pct}%`, minWidth: totalCommitted > 0 ? "4px" : "0" }}
          />
        </div>
        <div className="flex justify-between text-xs text-[--text-muted]">
          <span>{formatCompact(totalCommitted)} raised</span>
          <span>{pct}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-input] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Funding Progress</div>
        <div className="text-sm text-teal-400 font-medium">{pct}%</div>
      </div>

      <div className="h-3 rounded-full bg-[--bg-elevated] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-500"
          style={{ width: `${pct}%`, minWidth: totalCommitted > 0 ? "8px" : "0" }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[--text-secondary]">
          <span className="font-semibold text-[--text-primary]">{formatCurrency(totalCommitted)}</span>
          {" / "}
          {formatCurrency(targetRaise)} raised
        </span>
        {investorCount !== undefined && investorCount > 0 && (
          <span className="text-[--text-muted]">
            {investorCount} investor{investorCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
