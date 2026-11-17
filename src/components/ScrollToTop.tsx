"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

const ScrollButton = () => {
  const [showUp, setShowUp] = useState(false);

  const getScrollContainer = (): HTMLElement | Window | null => {
    const main = document.querySelector('main');
    return main && main.scrollHeight > main.clientHeight ? main : window;
  };

  const getScrollTop = (): number => {
    const main = document.querySelector('main');
    if (main && main.scrollHeight > main.clientHeight) {
      return main.scrollTop;
    }
    return window.scrollY || document.documentElement.scrollTop;
  };

  const checkScroll = useCallback(() => {
    setShowUp(getScrollTop() > 100);
  }, []);

  useEffect(() => {
    checkScroll();

    const target = getScrollContainer();
    if (target instanceof Window) {
      window.addEventListener('scroll', checkScroll, { passive: true });
      return () => window.removeEventListener('scroll', checkScroll);
    } else if (target) {
      target.addEventListener('scroll', checkScroll, { passive: true });
      return () => target.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll]);

  const handleClick = () => {
    const main = document.querySelector('main');
    const hasScrollableMain = main && main.scrollHeight > main.clientHeight;

    if (showUp) {
      if (hasScrollableMain) {
        main.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      if (hasScrollableMain) {
        main.scrollTo({
          top: main.scrollHeight - main.clientHeight,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo({
          top: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-8 right-8 z-[100] p-3 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all border border-indigo-400/30 backdrop-blur-sm"
      aria-label={showUp ? "Scroll to top" : "Scroll to bottom"}
    >
      <motion.div
        key={showUp ? 'up' : 'down'}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center"
      >
        {showUp ? (
          <ChevronUp className="w-6 h-6" />
        ) : (
          <ChevronDown className="w-6 h-6" />
        )}
      </motion.div>
    </motion.button>
  );
};

export default ScrollButton;
