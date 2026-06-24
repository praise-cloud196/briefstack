"use client";

import { useState, useEffect } from "react";

const WORDS = ["ideas", "topics", "terms"] as const;
const PAUSE_MS = 2600;
const TRANSITION_MS = 400;

export function RotatingWord() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pause = setInterval(() => {
      setIsAnimating(true);
      timeoutId = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % WORDS.length);
        setIsAnimating(false);
      }, TRANSITION_MS);
    }, PAUSE_MS);

    return () => {
      clearInterval(pause);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, []);

  const currentWord = WORDS[currentIndex];
  const nextWord = WORDS[(currentIndex + 1) % WORDS.length];

  return (
    <span className="relative inline-block">
      <span className="invisible" aria-hidden="true">
        topics
      </span>
      <span className="absolute inset-0 overflow-hidden">
        <span
          className="block transition-transform ease-in-out"
          style={{
            transform: isAnimating ? "translateY(-100%)" : "translateY(0)",
            transitionDuration: isAnimating ? `${TRANSITION_MS}ms` : "0ms",
          }}
        >
          {currentWord}
        </span>
        <span
          className="block transition-transform ease-in-out"
          style={{
            transform: isAnimating ? "translateY(-100%)" : "translateY(0)",
            transitionDuration: isAnimating ? `${TRANSITION_MS}ms` : "0ms",
          }}
        >
          {nextWord}
        </span>
      </span>
    </span>
  );
}
