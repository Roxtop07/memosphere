"use client"

import type { Variants } from "framer-motion"

// Sidebar animations
export const sidebarVariants: Variants = {
  open: {
    width: "16rem",
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  closed: {
    width: "0rem",
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
}

// Fade and scale animations
export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
}

// Card animations
export const cardHoverVariants: Variants = {
  rest: { scale: 1, boxShadow: "0px 0px 0px rgba(0, 0, 0, 0.1)" },
  hover: {
    scale: 1.02,
    boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.15)",
    transition: { type: "spring", stiffness: 400, damping: 10 },
  },
}

// Stagger animation for list items
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

// Tab transition animations
export const tabContentVariants: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.2 } },
}

// Progress animations
export const progressVariants: Variants = {
  initial: { width: 0 },
  animate: (width: number) => ({
    width: `${width}%`,
    transition: { duration: 0.6, ease: "easeInOut" },
  }),
}
