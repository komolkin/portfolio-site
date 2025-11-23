"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "Are you available for freelance?",
    answer:
      "Yes, I am currently open to new projects and collaborations. Feel free to reach out!",
  },
  {
    question: "What is your tech stack?",
    answer:
      "I primarily work with React, Next.js, TypeScript, Tailwind CSS, and various 3D libraries like Three.js and Spline.",
  },
  {
    question: "Do you do 3D design?",
    answer:
      "Yes, I specialize in integrating 3D elements into web interfaces to create immersive experiences.",
  },
];

export default function FAQWidget() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="p-4 w-[280px]">
      <div className="space-y-2">
        {FAQ_DATA.map((item, index) => (
          <div
            key={index}
            className="bg-muted/50 rounded-md overflow-hidden transition-colors hover:bg-muted"
          >
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent drag start if clicking here triggers it, though Draggable handles this via pointerDown logic usually
                toggleQuestion(index);
              }}
              onPointerDown={(e) => e.stopPropagation()} // Stop propagation to Draggable to allow clicking without dragging
              className="w-full px-3 py-2 text-left flex items-center justify-between gap-2"
            >
              <span className="text-xs font-medium text-foreground leading-snug">
                {item.question}
              </span>
              <motion.svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground flex-shrink-0"
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Horizontal line (always visible) */}
                <path d="M2 5L8 5" />
                {/* Vertical line (visible only when closed, creating a +) */}
                <motion.path
                  d="M5 2L5 8"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: openIndex === index ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.svg>
            </button>

            <AnimatePresence initial={false}>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <div className="px-3 pb-3 pt-0">
                    <p className="text-[11px] text-muted-foreground leading-[1.4]">
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
