"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

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

export function StreamingWords({ words }: { words: StreamingWord[] }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <>
      {words.map(({ key, content, delayIndex }) => (
        <motion.span
          key={key}
          className="inline"
          initial={
            prefersReducedMotion
              ? false
              : { opacity: 0, y: "0.3em", filter: "blur(10px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: WORD_DURATION,
            delay: delayIndex * WORD_STAGGER,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {content}
        </motion.span>
      ))}
    </>
  );
}
