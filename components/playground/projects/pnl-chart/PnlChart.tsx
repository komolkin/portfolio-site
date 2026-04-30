"use client";

import { useState } from "react";
import WormPnlChart from "@/components/playground/projects/pnl-chart/WormPnlChart";

const DEFAULT_WALLET = "";
const DEFAULT_WORKER_URL = "https://worm-pnl-worker.pnl-checker.workers.dev/";

export default function PnlChart() {
  const [wallet, setWallet] = useState(DEFAULT_WALLET);
  const hasWallet = wallet.trim().length > 0;

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-3 px-2">
      <div className="grid grid-cols-1">
        <label className="relative block rounded-[20px] bg-[#1d1d1d] px-6 py-4">
          {hasWallet ? (
            <>
              <span className="pointer-events-none block font-mono text-[14px] uppercase leading-[1.25] tracking-wide text-muted-foreground">
                Wallet
              </span>
              <input
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="mt-1 w-full bg-transparent font-mono text-[16px] leading-[1.25] text-foreground outline-none"
              />
            </>
          ) : (
            <>
              <span className="pointer-events-none block font-mono text-[14px] uppercase leading-[1.25] tracking-wide text-muted-foreground">
                Paste Wallet
              </span>
              <input
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder=""
                className="absolute inset-0 w-full bg-transparent px-6 py-4 font-mono text-[16px] text-transparent caret-foreground outline-none"
              />
            </>
          )}
        </label>
      </div>

      <WormPnlChart
        wallet={wallet.trim()}
        workerUrl={DEFAULT_WORKER_URL}
        height={150}
      />
    </div>
  );
}
