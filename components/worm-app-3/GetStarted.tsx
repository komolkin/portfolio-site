"use client";

import { motion } from "framer-motion";
import { hapticTap } from "@/lib/haptics";
import RollTypeCard from "./roll-type/RollTypeCard";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function GetStarted({ onComplete }: { onComplete: () => void }) {
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Get started"
    >
      <div className="absolute inset-0 z-0">
        <RollTypeCard className="h-full w-full" />
      </div>

      <div className="pointer-events-none relative z-[3] mt-auto mx-auto flex w-full max-w-[430px] shrink-0 flex-col gap-3.5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
        <motion.button
          type="button"
          onClick={() => {
            hapticTap();
            onComplete();
          }}
          className="pointer-events-auto flex h-[52px] w-full origin-center items-center justify-center rounded-[18px] bg-black text-[16px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.94]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.94 }}
          transition={{ opacity: { duration: 0.45, delay: 0.28, ease: EASE }, scale: { duration: 0.12 } }}
        >
          Get started
        </motion.button>
        <motion.p
          className="pointer-events-auto pb-1 text-center text-[11px] leading-[1.45] text-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          By continuing, you agree to our
          <br />
          <button type="button" className="font-semibold text-black">
            Terms of Service
          </button>{" "}
          and{" "}
          <button type="button" className="font-semibold text-black">
            Privacy Policy
          </button>
        </motion.p>
      </div>
    </div>
  );
}
