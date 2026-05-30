"use client";

import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface CelebrationOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

export function CelebrationOverlay({ isVisible, onComplete }: CelebrationOverlayProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const handleResize = () => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Check localStorage to prevent multi-tab confetti
      const celebrationShown = localStorage.getItem("celebration_shown");
      const now = Date.now();

      if (celebrationShown && now - parseInt(celebrationShown) < 60000) {
        // Already shown in last 60 seconds, skip
        onComplete();
        return;
      }

      // Mark as shown
      localStorage.setItem("celebration_shown", now.toString());
      setShowConfetti(true);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
        onComplete();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && showConfetti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <Confetti
            width={dimensions.width}
            height={dimensions.height}
            recycle={false}
            numberOfPieces={120}
            gravity={0.22}
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="sw-card relative w-full max-w-md p-6 text-center shadow-[0_24px_60px_-32px_var(--color-shadow)] sm:p-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-5 flex justify-center"
            >
              <div className="flex size-14 items-center justify-center rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
                <Check className="size-7 text-[var(--color-accent-2)]" strokeWidth={3} />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink)]"
            >
              Professional access enabled
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-3 text-sm leading-6 text-[var(--color-ink-2)]"
            >
              You now have access to the full forecast workbench.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 space-y-2 text-left"
            >
              {[
                "Full crypto and equities coverage",
                "Confidence bands for each projection",
                "Early access to watchlist tooling",
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]"
                >
                  <Check className="size-4 text-[var(--color-accent-2)]" aria-hidden="true" />
                  <span>{feature}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 text-xs text-[var(--color-muted)]"
            >
              This window will close automatically.
            </motion.p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
