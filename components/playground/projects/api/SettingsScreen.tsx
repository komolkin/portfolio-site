"use client";

import { useState, type ReactNode } from "react";
import UserAvatar from "./UserAvatar";

function shortWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-sfx="click"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#00D54B]" : "bg-white/15"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsRow({
  label,
  detail,
  action,
  onClick,
}: {
  label: string;
  detail?: string;
  action?: ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      data-sfx={onClick ? "click" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${
        onClick ? "transition-colors hover:bg-white/[0.04]" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{label}</p>
        {detail ? (
          <p className="mt-0.5 truncate text-[11px] text-white/40">{detail}</p>
        ) : null}
      </div>
      {action ?? (onClick ? <ChevronIcon className="h-4 w-4 text-white/30" /> : null)}
    </Tag>
  );
}

export default function SettingsScreen({
  username,
  wallet,
  followingCount,
  copyTradeCount,
  onUsernameChange,
  onResetOnboarding,
  onOpenCopytrades,
}: {
  username: string | null;
  wallet: string | null;
  followingCount: number;
  copyTradeCount: number;
  onUsernameChange: (username: string) => void;
  onResetOnboarding: () => void;
  onOpenCopytrades: () => void;
}) {
  const [editingUsername, setEditingUsername] = useState(false);
  const [draftUsername, setDraftUsername] = useState(username ?? "");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [tradeAlerts, setTradeAlerts] = useState(true);
  const [feedActivity, setFeedActivity] = useState(false);

  const trimmed = draftUsername.trim().replace(/^@/, "");
  const usernameValid = /^[a-zA-Z0-9_]{3,16}$/.test(trimmed);

  const saveUsername = () => {
    if (!usernameValid) return;
    onUsernameChange(trimmed);
    setEditingUsername(false);
  };

  return (
    <div className="flex flex-col gap-4 pb-2">
      <section
        aria-label="Account"
        className="overflow-hidden rounded-[20px] bg-white/[0.08]"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-3.5 py-3.5">
          <UserAvatar
            seed={wallet ?? username ?? "profile"}
            label={username ?? wallet ?? "?"}
            className="h-11 w-11 text-[13px]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">
              {username ?? "Trader"}
            </p>
            {wallet ? (
              <p className="mt-0.5 text-[11px] tabular-nums text-white/40">
                {shortWallet(wallet)}
              </p>
            ) : null}
          </div>
        </div>

        {editingUsername ? (
          <div className="space-y-2.5 px-3.5 py-3.5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40">
              Username
            </label>
            <div className="flex items-center gap-2 rounded-full bg-white/[0.1] px-3.5 py-2.5">
              <span className="text-[14px] text-white/35">@</span>
              <input
                type="text"
                value={draftUsername}
                onChange={(e) => setDraftUsername(e.target.value)}
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/30"
                placeholder="username"
              />
            </div>
            {!usernameValid && trimmed.length > 0 ? (
              <p className="text-[11px] text-[#FF375F]">
                3–16 characters, letters, numbers, and underscores only.
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                data-sfx="click"
                onClick={() => {
                  setDraftUsername(username ?? "");
                  setEditingUsername(false);
                }}
                className="flex-1 rounded-full bg-white/[0.1] py-2.5 text-[13px] font-semibold text-white/80 transition-opacity hover:opacity-90"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!usernameValid}
                data-sfx="press"
                onClick={saveUsername}
                className="flex-1 rounded-full bg-white py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <SettingsRow
            label="Username"
            detail={username ? `@${username}` : "Not set"}
            onClick={() => {
              setDraftUsername(username ?? "");
              setEditingUsername(true);
            }}
          />
        )}

        <div className="border-t border-white/[0.06]">
          <SettingsRow
            label="Connected wallet"
            detail={wallet ? shortWallet(wallet) : "Not connected"}
          />
        </div>
      </section>

      <section aria-label="Preferences">
        <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.02em]">
          Preferences
        </h3>
        <div className="overflow-hidden rounded-[20px] bg-white/[0.08]">
          <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">Push notifications</p>
              <p className="mt-0.5 text-[11px] text-white/40">
                Alerts for follows and mentions
              </p>
            </div>
            <Toggle
              checked={pushEnabled}
              onChange={setPushEnabled}
              label="Push notifications"
            />
          </div>
          <div className="border-t border-white/[0.06]">
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium">Trade alerts</p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  When people you follow place trades
                </p>
              </div>
              <Toggle
                checked={tradeAlerts}
                onChange={setTradeAlerts}
                label="Trade alerts"
              />
            </div>
          </div>
          <div className="border-t border-white/[0.06]">
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium">Feed activity</p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  Show your trades in the public feed
                </p>
              </div>
              <Toggle
                checked={feedActivity}
                onChange={setFeedActivity}
                label="Feed activity"
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Social">
        <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.02em]">
          Social
        </h3>
        <div className="overflow-hidden rounded-[20px] bg-white/[0.08]">
          <SettingsRow
            label="Following"
            detail={`${followingCount} trader${followingCount === 1 ? "" : "s"}`}
          />
          <div className="border-t border-white/[0.06]">
            <SettingsRow
              label="Copytrades"
              detail={
                copyTradeCount === 0
                  ? "None yet"
                  : `${copyTradeCount} trader${copyTradeCount === 1 ? "" : "s"}`
              }
              onClick={onOpenCopytrades}
            />
          </div>
        </div>
      </section>

      <section aria-label="Support">
        <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.02em]">
          Support
        </h3>
        <div className="overflow-hidden rounded-[20px] bg-white/[0.08]">
          <SettingsRow label="Help center" onClick={() => {}} />
          <div className="border-t border-white/[0.06]">
            <SettingsRow label="Terms of service" onClick={() => {}} />
          </div>
          <div className="border-t border-white/[0.06]">
            <SettingsRow label="Privacy policy" onClick={() => {}} />
          </div>
        </div>
      </section>

      <section aria-label="Account actions">
        <div className="overflow-hidden rounded-[20px] bg-white/[0.08]">
          <button
            type="button"
            onClick={onResetOnboarding}
            className="flex w-full px-3.5 py-3.5 text-left text-[15px] font-medium text-white/80 transition-colors hover:bg-white/[0.04]"
          >
            Reset onboarding
          </button>
          <div className="border-t border-white/[0.06]">
            <button
              type="button"
            className="flex w-full px-3.5 py-3.5 text-left text-[15px] font-medium text-[#FF375F] transition-colors hover:bg-white/[0.04]"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
