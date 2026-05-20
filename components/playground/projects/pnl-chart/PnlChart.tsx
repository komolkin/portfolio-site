"use client";

import WormPnlChart from "@/components/playground/projects/pnl-chart/WormPnlChart";

const DEFAULT_WALLET = "5SuFWtyUXRKNoyEMFC2mmVtuzEgFn1ezpG3SGirfJ3Lp";
const DEFAULT_WORKER_URL = "https://worm-pnl-worker.pnl-checker.workers.dev/";

export default function PnlChart() {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-3 px-2">
      <WormPnlChart
        wallet={DEFAULT_WALLET}
        workerUrl={DEFAULT_WORKER_URL}
        height={150}
      />
    </div>
  );
}
