"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const ScrollButton = () => {
  const [showUp, setShowUp] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      setShowUp(window.scrollY > 100);
    };

    checkScroll();

    window.addEventListener("scroll", checkScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", checkScroll);
    };
  }, []);

  const handleClick = () => {
    if (showUp) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[99999] rounded-full bg-indigo-600 p-3 text-white shadow-lg hover:bg-indigo-700"
      aria-label={showUp ? "Scroll to top" : "Scroll to bottom"}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.08 }}
    >
      {showUp ? (
        <ChevronUp className="h-6 w-6" />
      ) : (
        <ChevronDown className="h-6 w-6" />
      )}
    </motion.button>
  );
};

export default ScrollButton;