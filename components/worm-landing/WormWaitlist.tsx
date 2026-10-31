"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type HTMLAttributes,
} from "react";

const PRESS =
  "transition-transform duration-150 ease-out active:scale-[0.97]";
const TITLE_WORDS = ["follow", "share", "earn", "copy"] as const;
const TITLE_EASE = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = "worm_waitlist_submitted";
const DONE_EVENT = "worm-waitlist-done";
const EASE_OUT = "cubic-bezier(0.22,1,0.36,1)";
const AI_LOGOS = [
  { id: "claude", src: "/playground/ai/logo-claude.svg", label: "Claude" },
  {
    id: "openai",
    src: "/playground/ai/logo-openai.svg",
    label: "OpenAI",
    invert: true,
  },
  {
    id: "grok",
    src: "/playground/ai/logo-grok.svg",
    label: "Grok",
    invert: true,
  },
] as const;
const AI_CYCLE_MS = 3_000;
const AI_LOGO_SIZE = 20;

const letterVariants = {
  initial: { y: "110%" },
  animate: { y: "0%" },
  exit: { y: "-110%" },
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function readDoneFromStorage() {
  try {
    return (
      typeof sessionStorage !== "undefined" &&
      Boolean(sessionStorage.getItem(STORAGE_KEY))
    );
  } catch {
    return false;
  }
}

function markDoneInStorage() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(DONE_EVENT));
}

function clearDoneFromStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function WormInLink() {
  const prefersReducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const logo = AI_LOGOS[index];

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % AI_LOGOS.length);
    }, AI_CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      aria-label={`Worm in with ${logo.label}`}
      className={`relative z-10 inline-flex items-center gap-1 rounded-full text-[15px] font-semibold tracking-[-0.015em] text-[#141416] hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
    >
      <span>Worm in</span>
      <span
        className="relative block shrink-0 overflow-hidden"
        style={{ width: AI_LOGO_SIZE, height: AI_LOGO_SIZE }}
        aria-hidden
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={logo.id}
            className="absolute inset-0 block"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { y: AI_LOGO_SIZE, opacity: 0 }
            }
            animate={{ y: 0, opacity: 1 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { y: -AI_LOGO_SIZE, opacity: 0 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <img
              src={logo.src}
              alt=""
              width={AI_LOGO_SIZE}
              height={AI_LOGO_SIZE}
              className={cn(
                "pointer-events-none size-full select-none",
                "invert" in logo && logo.invert && "brightness-0",
              )}
              draggable={false}
            />
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

function AppleMark() {
  return (
    <svg
      viewBox="0 0 16 20"
      className="h-[18px] w-[15px]"
      fill="currentColor"
      aria-hidden
    >
      <path d="M13.2 10.5c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.2c.7-1 1.2-2.1 1.5-3.2-3.9-1.5-3.8-5.5-3.8-5.4zM10.9 3.8c.6-.8 1.1-1.9.9-3-.9.1-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.6-1.3z" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M12.5 5.5L8 10l4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M3.5 8h9M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden>
      <path
        d="M5 12.5l5 5L19 7"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 animate-spin"
      fill="none"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WaitlistSuccess() {
  return (
    <div className="mx-auto flex max-w-[420px] flex-col items-center text-center">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white"
        aria-hidden
      >
        <CheckMark />
      </div>
      <h3 className="mt-5 text-[28px] font-semibold tracking-[-0.035em] text-[#141416] sm:text-[32px]">
        You&apos;re on the list
      </h3>
      <p className="mt-2 text-pretty text-[18px] font-medium leading-[1.3] tracking-[-0.02em] text-[#5e5c56] sm:text-[20px]">
        For now you can use Worm from your favourite agent or the{" "}
        <a
          href="https://www.worm.wtf/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#141416] hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416]"
        >
          Web App
        </a>
        .
      </p>
    </div>
  );
}

function EarlyAccessForm({ onDone }: { onDone: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [expanded]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = (
      e.currentTarget.elements.namedItem("email") as HTMLInputElement
    ).value.trim();
    if (!email) {
      setError("Enter your email.");
      inputRef.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email.");
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      // UI-ready; wire to /api/waitlist when backend exists.
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      markDoneInStorage();
      onDone();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex w-full max-w-[400px] items-center justify-center">
        <div className="relative">
          <button
            type="button"
            disabled={!expanded || submitting}
            aria-label="Back"
            tabIndex={expanded ? 0 : -1}
            onClick={() => {
              setExpanded(false);
              setError(null);
              inputRef.current?.blur();
            }}
            className={cn(
              "absolute right-[calc(100%+10px)] top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#141416] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#efefef] active:scale-95 disabled:cursor-default motion-reduce:transition-none motion-reduce:active:scale-100",
              expanded
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-75 opacity-0",
            )}
          >
            <ChevronLeft />
          </button>

          <form
            noValidate
            onSubmit={(e) => void onSubmit(e)}
            aria-label="Early Access on iOS"
            onClick={() => {
              if (!expanded) setExpanded(true);
            }}
            className={cn(
              "relative flex h-[52px] items-center overflow-hidden rounded-full border transition-[width,background-color,border-color,box-shadow,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              expanded
                ? "w-[min(320px,calc(100vw-6.5rem))] cursor-text border-black/[0.08] bg-white shadow-[0_8px_28px_-12px_rgba(20,20,22,0.18)]"
                : "w-[228px] cursor-pointer border-transparent bg-black shadow-none hover:opacity-90 active:scale-[0.97] active:duration-150 motion-reduce:active:scale-100",
            )}
            style={{ transitionTimingFunction: EASE_OUT }}
          >
            {!expanded ? (
              <span
                aria-hidden
                className="worm-early-access-ring pointer-events-none absolute inset-0 rounded-full"
              />
            ) : null}

            <span
              aria-hidden={expanded}
              className={cn(
                "pointer-events-none absolute inset-0 z-[2] flex items-center justify-center gap-2.5 text-[17px] font-medium tracking-[-0.015em] text-white transition-opacity ease-out",
                expanded
                  ? "opacity-0 duration-200"
                  : "opacity-100 delay-300 duration-500",
              )}
            >
              <AppleMark />
              Early Access on iOS
            </span>

            <input
              ref={inputRef}
              id="waitlist-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={submitting}
              tabIndex={expanded ? 0 : -1}
              placeholder="Enter your email"
              aria-label="Email"
              aria-hidden={!expanded}
              className={cn(
                "h-full w-full appearance-none rounded-full bg-transparent pl-5 pr-14 text-[15px] text-[#141416] outline-none placeholder:text-[#8a8882] transition-opacity ease-out",
                expanded
                  ? "opacity-100 delay-200 duration-500"
                  : "pointer-events-none opacity-0 duration-300",
              )}
            />

            <button
              type="submit"
              disabled={!expanded || submitting}
              aria-label="Submit email"
              tabIndex={expanded ? 0 : -1}
              className={cn(
                "absolute right-1.5 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-90 active:scale-95 disabled:cursor-default motion-reduce:active:scale-100",
                expanded
                  ? "scale-100 opacity-100 delay-250 duration-500"
                  : "pointer-events-none scale-75 opacity-0 duration-300",
              )}
            >
              {expanded ? (
                <span
                  aria-hidden
                  className="worm-early-access-ring pointer-events-none absolute inset-0 rounded-full"
                />
              ) : null}
              <span className="relative z-[2]">
                {submitting ? <Spinner /> : <ArrowRight />}
              </span>
            </button>
          </form>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-center text-[13px] text-[#c0392b]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function WordLetters({
  value,
  className = "",
  ...rest
}: {
  value: string;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`inline-flex whitespace-nowrap ${className}`} {...rest}>
      {value.split("").map((letter, letterIndex) => (
        <span key={`${value}-${letterIndex}`} className="inline-block">
          {letter}
        </span>
      ))}
    </span>
  );
}

function RotatingTitle() {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState<number | "auto">("auto");
  const measureRef = useRef<HTMLSpanElement>(null);
  const word = TITLE_WORDS[index];
  const letters = word.split("");

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % TITLE_WORDS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-word="${word}"]`);
    if (!el) return;
    const next = Math.ceil(el.getBoundingClientRect().width) + 12;
    let shrinkTimer = 0;
    setWidth((prev) => {
      if (typeof prev !== "number" || next >= prev) return next;
      shrinkTimer = window.setTimeout(() => setWidth(next), 560);
      return prev;
    });
    return () => {
      if (shrinkTimer) window.clearTimeout(shrinkTimer);
    };
  }, [word]);

  return (
    <h1 className="text-balance text-[clamp(44px,7vw,76px)] font-medium leading-[0.98] tracking-[-0.045em]">
      <span className="block text-[#8a8882]">Social prediction app</span>
      <span className="block">
        <span className="text-[#8a8882]">for you to </span>
        <motion.span
          className="inline-grid overflow-hidden align-baseline leading-[inherit] text-[#141416]"
          initial={false}
          animate={{ width }}
          transition={{ duration: 0.6, ease: TITLE_EASE }}
          aria-label={word}
        >
          <WordLetters
            value="follow"
            className="invisible col-start-1 row-start-1"
            aria-hidden
          />
          <span
            ref={measureRef}
            className="pointer-events-none invisible absolute left-0 top-0"
            aria-hidden
          >
            {TITLE_WORDS.map((item) => (
              <span
                key={item}
                data-word={item}
                className="absolute left-0 top-0"
              >
                <WordLetters value={item} />
              </span>
            ))}
          </span>
          <span className="relative col-start-1 row-start-1 overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.span
                key={word}
                className="absolute left-0 top-0 inline-flex will-change-transform"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={{
                  initial: {},
                  animate: {
                    transition: {
                      staggerChildren: 0.028,
                      delayChildren: 0.02,
                    },
                  },
                  exit: {
                    transition: {
                      staggerChildren: 0.022,
                      staggerDirection: -1,
                    },
                  },
                }}
              >
                {letters.map((letter, letterIndex) => (
                  <motion.span
                    key={`${word}-${letterIndex}`}
                    variants={letterVariants}
                    transition={{ duration: 0.52, ease: TITLE_EASE }}
                    className="inline-block leading-[inherit]"
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.span>
      </span>
    </h1>
  );
}

function DvdParachute() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const state = useRef({ x: 64, y: 120, vx: 2.1, vy: 1.75 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const size = () => {
      const width = el.offsetWidth || 118;
      const height = el.offsetHeight || 118;
      return { w: width, h: height };
    };

    const bounds = () => {
      const { w, h } = size();
      const root = (el.parentElement ?? el.offsetParent) as HTMLElement | null;
      const maxX = Math.max(0, (root?.clientWidth ?? window.innerWidth) - w);
      const maxY = Math.max(0, (root?.clientHeight ?? window.innerHeight) - h);
      return { maxX, maxY };
    };

    let { maxX, maxY } = bounds();
    const speed = reduceMotion ? 0.7 : 2.1;
    state.current = {
      x: Math.random() * maxX,
      y: Math.random() * maxY,
      vx: (Math.random() > 0.5 ? 1 : -1) * speed,
      vy: (Math.random() > 0.5 ? 1 : -1) * (speed * 0.85),
    };
    el.style.transform = `translate3d(${state.current.x}px, ${state.current.y}px, 0)`;

    let raf = 0;
    const tick = () => {
      ({ maxX, maxY } = bounds());
      let { x, y, vx, vy } = state.current;
      x += vx;
      y += vy;
      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
      } else if (x >= maxX) {
        x = maxX;
        vx = -Math.abs(vx);
      }
      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
      } else if (y >= maxY) {
        y = maxY;
        vy = -Math.abs(vy);
      }
      state.current = { x, y, vx, vy };
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    const onResize = () => {
      ({ maxX, maxY } = bounds());
      state.current.x = Math.min(state.current.x, maxX);
      state.current.y = Math.min(state.current.y, maxY);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [reduceMotion]);

  return (
    <span
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[40] select-none text-[101px] leading-none will-change-transform sm:text-[118px]"
    >
      🪂
    </span>
  );
}

export function WormWaitlist() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(readDoneFromStorage());
    const onDone = () => setDone(true);
    window.addEventListener(DONE_EVENT, onDone);
    return () => window.removeEventListener(DONE_EVENT, onDone);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] bg-[#f6f5f2] text-[#141416]">
      <div className="pointer-events-none absolute inset-0 z-[40] overflow-hidden">
        <DvdParachute />
      </div>
      <div className="relative z-10 h-full overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
        <header className="sticky top-0 z-50">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+2.75rem)]"
          >
            <div className="worm-header-blur">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-transparent" />
          </div>
          <div className="relative mx-auto flex h-12 w-full max-w-[1440px] items-center justify-between px-5 py-4 sm:h-16 sm:px-8 sm:py-4">
            <a
              href="/waitlist"
              aria-label="Worm"
              onClick={(event) => {
                event.preventDefault();
                clearDoneFromStorage();
                setDone(false);
              }}
              className={`relative z-10 flex shrink-0 items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
            >
              <img
                src="/worm/logo-mark.png"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            </a>
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <WormInLink />
              <a
                href="https://www.worm.wtf/"
                target="_blank"
                rel="noreferrer"
                className={`text-[15px] font-semibold tracking-[-0.015em] text-[#141416] hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
              >
                Web App
              </a>
              <a
                href="https://x.com/wormwtf"
                target="_blank"
                rel="noreferrer"
                aria-label="Worm on X"
                className={`text-[15px] font-semibold tracking-[-0.015em] text-[#141416] hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#141416] ${PRESS}`}
              >
                X
              </a>
            </div>
          </div>
        </header>

        <main className="relative flex min-h-[calc(100svh-5rem)] flex-col items-center justify-center px-5 pb-16 pt-8 text-center sm:px-8">
          <div className="mx-auto w-full max-w-[760px]">
            <AnimatePresence mode="wait" initial={false}>
              {!done ? (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-10 sm:mb-12">
                    <RotatingTitle />
                  </div>
                  <EarlyAccessForm onDone={() => setDone(true)} />
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <WaitlistSuccess />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
