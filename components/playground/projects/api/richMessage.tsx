"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ReactionGif = {
  id: string;
  label: string;
  tags: string;
  url: string;
};

export const REACTION_GIFS: ReactionGif[] = [
  {
    id: "lets-go",
    label: "Let's go",
    tags: "lets go hype celebrate win excited sports",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200w.gif",
  },
  {
    id: "fire",
    label: "Fire",
    tags: "fire lit heat flame cooked",
    url: "https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/200w.gif",
  },
  {
    id: "money",
    label: "Money",
    tags: "money cash rain dollar rich payout",
    url: "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/200w.gif",
  },
  {
    id: "mind-blown",
    label: "Mind blown",
    tags: "mind blown wow shocked insane",
    url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/200w.gif",
  },
  {
    id: "thumbs-up",
    label: "Thumbs up",
    tags: "thumbs up yes agree nice good",
    url: "https://media.giphy.com/media/111ebonMs90YLu/200w.gif",
  },
  {
    id: "laugh",
    label: "Laugh",
    tags: "laugh lol lmao funny crying cat",
    url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/200w.gif",
  },
  {
    id: "clap",
    label: "Clap",
    tags: "clap applause bravo respect",
    url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/200w.gif",
  },
  {
    id: "think",
    label: "Thinking",
    tags: "think thinking hmm maybe unsure",
    url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/200w.gif",
  },
  {
    id: "wow",
    label: "Wow",
    tags: "wow omg shocked surprised",
    url: "https://media.giphy.com/media/5VKbvrjxpVJCM/200w.gif",
  },
  {
    id: "spongebob",
    label: "Excited",
    tags: "excited spongebob rainbow hype",
    url: "https://media.giphy.com/media/26ufnwz3wDUli7GU0/200w.gif",
  },
  {
    id: "cheers",
    label: "Cheers",
    tags: "cheers toast drink celebrate",
    url: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/200w.gif",
  },
  {
    id: "dance",
    label: "Dance",
    tags: "dance party vibe winning",
    url: "https://media.giphy.com/media/26BRuo6sLetdllPAQ/200w.gif",
  },
  {
    id: "nope",
    label: "Nope",
    tags: "nope nah no fade fade this",
    url: "https://media.giphy.com/media/26n6WywJyh39n1pBu/200w.gif",
  },
  {
    id: "nervous",
    label: "Nervous",
    tags: "nervous sweat anxious yikes",
    url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/200w.gif",
  },
  {
    id: "winner",
    label: "Winner",
    tags: "winner trophy champ cooked lock",
    url: "https://media.giphy.com/media/l0MYC0LajbaPoEADu/200w.gif",
  },
  {
    id: "nice",
    label: "Nice",
    tags: "nice borat great",
    url: "https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/200w.gif",
  },
];

export const EMOJIS = [
  "🔥",
  "👀",
  "🧠",
  "📈",
  "📉",
  "💰",
  "🚀",
  "⚡",
  "🎯",
  "💎",
  "🫡",
  "😂",
  "😭",
  "😎",
  "🤔",
  "😤",
  "💪",
  "🏆",
  "🤞",
  "🫠",
  "💀",
  "🐐",
  "🧊",
  "🚨",
  "✅",
  "❌",
  "😍",
  "😅",
  "🤯",
  "😏",
  "🙏",
  "👏",
  "🙈",
  "🤝",
  "🍀",
  "💸",
];

export function pickGif(seed: number): ReactionGif {
  return REACTION_GIFS[seed % REACTION_GIFS.length]!;
}

export function searchGifs(query: string): ReactionGif[] {
  const q = query.trim().toLowerCase();
  if (!q) return REACTION_GIFS;
  return REACTION_GIFS.filter(
    (gif) =>
      gif.label.toLowerCase().includes(q) || gif.tags.includes(q),
  );
}

export function GifThumb({
  url,
  alt = "",
  className = "max-h-[168px]",
}: {
  url: string;
  alt?: string;
  className?: string;
}) {
  return (
    <span className="inline-block overflow-hidden rounded-[16px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className={`w-auto max-w-full object-cover ${className}`}
      />
    </span>
  );
}

function EmojiIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="9" cy="10" r="1.15" fill="currentColor" />
      <circle cx="15" cy="10" r="1.15" fill="currentColor" />
      <path
        d="M8.5 14.25c.9 1.7 2.15 2.55 3.5 2.55s2.6-.85 3.5-2.55"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GifBadgeIcon() {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[5px] border-[1.6px] border-current px-[5px] py-[3px] text-[10px] font-bold leading-none tracking-[0.08em]"
      aria-hidden
    >
      GIF
    </span>
  );
}

export function MessageComposer({
  text,
  gifUrl,
  onTextChange,
  onGifChange,
  onSubmit,
  placeholder,
  submitLabel = "Send",
  autoFocus = false,
}: {
  text: string;
  gifUrl: string | null;
  onTextChange: (value: string) => void;
  onGifChange: (url: string | null) => void;
  onSubmit?: () => void;
  placeholder: string;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const [picker, setPicker] = useState<"emoji" | "gif" | null>(null);
  const [gifQuery, setGifQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gifs = useMemo(() => searchGifs(gifQuery), [gifQuery]);
  const canSend = Boolean(text.trim() || gifUrl);

  useEffect(() => {
    if (!autoFocus) return;
    textareaRef.current?.focus();
  }, [autoFocus]);

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      onTextChange(`${text}${emoji}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    onTextChange(next);
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="rounded-[20px] bg-white/[0.08]">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        maxLength={280}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && onSubmit && canSend) {
            e.preventDefault();
            onSubmit();
            setPicker(null);
          }
        }}
        className="w-full resize-none bg-transparent px-3.5 pb-1.5 pt-3 text-[14px] leading-snug text-white outline-none placeholder:text-white/30"
      />

      {gifUrl && (
        <div className="relative mx-3.5 mb-2 inline-block">
          <GifThumb url={gifUrl} />
          <button
            type="button"
            onClick={() => onGifChange(null)}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
            aria-label="Remove GIF"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 px-2 pb-2">
        <button
          type="button"
          aria-pressed={picker === "emoji"}
          onClick={() => setPicker((prev) => (prev === "emoji" ? null : "emoji"))}
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            picker === "emoji" ? "bg-white/15 text-white" : "text-white/45 hover:text-white"
          }`}
          aria-label="Add emoji"
        >
          <EmojiIcon className="h-[22px] w-[22px]" />
        </button>
        <button
          type="button"
          aria-pressed={picker === "gif"}
          onClick={() => setPicker((prev) => (prev === "gif" ? null : "gif"))}
          className={`flex h-8 items-center justify-center rounded-full px-1.5 ${
            picker === "gif" ? "bg-white/15 text-white" : "text-white/45 hover:text-white"
          }`}
          aria-label="Add GIF"
        >
          <GifBadgeIcon />
        </button>
        {onSubmit && (
          <button
            type="button"
            disabled={!canSend}
            onClick={() => {
              onSubmit();
              setPicker(null);
            }}
            className="ml-auto rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-black disabled:bg-white/15 disabled:text-white/35"
          >
            {submitLabel}
          </button>
        )}
      </div>

      {picker === "emoji" && (
        <div className="grid grid-cols-8 gap-1 border-t border-white/[0.06] px-2.5 py-2.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className="flex h-8 items-center justify-center rounded-lg text-[18px] hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {picker === "gif" && (
        <div className="border-t border-white/[0.06] px-2.5 py-2.5">
          <input
            type="search"
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            placeholder="Search GIFs"
            className="mb-2 w-full rounded-full bg-white/[0.1] px-3 py-1.5 text-[13px] text-white outline-none placeholder:text-white/35"
          />
          {gifs.length === 0 ? (
            <p className="py-3 text-center text-[12px] text-white/40">
              No GIFs match that.
            </p>
          ) : (
            <div className="grid max-h-[188px] grid-cols-3 gap-1.5 overflow-y-auto">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => {
                    onGifChange(gif.url);
                    setPicker(null);
                    setGifQuery("");
                  }}
                  className="overflow-hidden rounded-xl bg-white/[0.1]"
                  aria-label={gif.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gif.url}
                    alt=""
                    className="h-[72px] w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
