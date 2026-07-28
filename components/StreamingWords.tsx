"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MutableRefObject, ReactNode } from "react";

export type StreamingWord = {
  key: string;
  content: ReactNode;
  delayIndex: number;
};

const WORD_STAGGER = 0.07;
const WORD_DURATION = 0.42;

export function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function pushTextWords(
  words: StreamingWord[],
  prefix: string,
  text: string,
  delayIndex: { current: number },
  renderWord?: (word: string) => ReactNode
) {
  splitWords(text).forEach((word, i) => {
    words.push({
      key: `${prefix}-${i}`,
      delayIndex: delayIndex.current++,
      content: renderWord ? (
        renderWord(word)
      ) : (
        <>
          {word}
          {" "}
        </>
      ),
    });
  });
}

export function assignWordDelays(
  words: StreamingWord[],
  delaysRef: MutableRefObject<Map<string, number>>,
): StreamingWord[] {
  let nextDelay = 0;
  for (const delay of delaysRef.current.values()) {
    nextDelay = Math.max(nextDelay, delay + 1);
  }

  return words.map((word) => {
    if (!delaysRef.current.has(word.key)) {
      delaysRef.current.set(word.key, nextDelay++);
    }

    return {
      ...word,
      delayIndex: delaysRef.current.get(word.key)!,
    };
  });
}

export function assignSegmentWordDelays<
  T extends { words: StreamingWord[] },
>(segments: T[], delaysRef: MutableRefObject<Map<string, number>>): T[] {
  return segments.map((segment) => ({
    ...segment,
    words: assignWordDelays(segment.words, delaysRef),
  }));
}

export function StreamingWords({
  words,
  animatedWordKeysRef,
}: {
  words: StreamingWord[];
  animatedWordKeysRef?: MutableRefObject<Set<string>>;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      {words.map(({ key, content, delayIndex }) => {
        const hasAnimated = animatedWordKeysRef?.current.has(key) ?? false;

        return (
          <motion.span
            key={key}
            className="inline"
            initial={
              prefersReducedMotion || hasAnimated
                ? false
                : { opacity: 0, y: "0.3em", filter: "blur(10px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: WORD_DURATION,
              delay: delayIndex * WORD_STAGGER,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => {
              animatedWordKeysRef?.current.add(key);
            }}
          >
            {content}
          </motion.span>
        );
      })}
    </>
  );
}
