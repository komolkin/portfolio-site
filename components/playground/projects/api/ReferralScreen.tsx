"use client";

import { useMemo, useState } from "react";

function shortWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function ReferralIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12h16M12 22V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 7h20v5H2V7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect
        x="5.5"
        y="5.5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.5 10.5v-6a1.5 1.5 0 0 1 1.5-1.5h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const STEPS = [
  {
    title: "Share your link",
    body: "Send your invite link to friends who trade on Polymarket.",
  },
  {
    title: "They sign up & trade",
    body: "New users connect a wallet and place their first trade.",
  },
  {
    title: "You both earn",
    body: "Get 10% of their trading fees for the first 30 days.",
  },
] as const;

export default function ReferralScreen({
  username,
  wallet,
}: {
  username: string | null;
  wallet: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const referralCode = useMemo(() => {
    if (username) return username.toLowerCase();
    if (wallet) return wallet.slice(2, 10).toLowerCase();
    return "invite";
  }, [username, wallet]);

  const referralLink = `polymarket.app/r/${referralCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${referralLink}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="rounded-[20px] bg-white/[0.08] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#00D54B]/15 text-[#00D54B]">
            <ReferralIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug">
              Invite friends, earn rewards
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/50">
              Share your link and earn a cut when people you refer start trading.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">
            Invited
          </p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.02em]">
            3
          </p>
        </div>
        <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">
            Earned
          </p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-[#00D54B]">
            $24.00
          </p>
        </div>
      </div>

      <section aria-label="Your referral link">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40">
          Your link
        </p>
        <div className="flex items-center gap-2 rounded-[20px] bg-white/[0.08] p-2 pl-3.5">
          <p className="min-w-0 flex-1 truncate text-[13px] tabular-nums text-white/80">
            {referralLink}
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          Code{" "}
          <span className="font-medium text-white/60">{referralCode}</span>
          {wallet && !username ? (
            <>
              {" "}
              · tied to {shortWallet(wallet)}
            </>
          ) : null}
        </p>
      </section>

      <section aria-label="How referrals work">
        <h3 className="mb-2.5 text-[17px] font-semibold tracking-[-0.02em]">
          How it works
        </h3>
        <ol className="flex flex-col gap-2">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-[20px] bg-white/[0.08] px-3.5 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold tabular-nums text-white/70">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">{step.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/45">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <button
        type="button"
        onClick={() => void copyLink()}
        className="w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-opacity hover:opacity-90"
      >
        Share invite
      </button>
    </div>
  );
}
