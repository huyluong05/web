import React from "react";
import { motion } from "motion/react";

export const Card = ({
  children,
  variant = "white",
  className = "",
  animate = false,
  hover = false,
  padding = "p-5 sm:p-6",
  ...props
}) => {
  const variantStyles = {
    white: "bg-white border border-slate-200 text-slate-800 shadow-sm",
    emerald: "bg-emerald-600 text-white border border-emerald-500 shadow-sm",
    subtle: "bg-slate-50 border border-slate-200 text-slate-800",
    glass:
      "bg-white/80 backdrop-blur-xl border border-white/60 text-slate-800 shadow-sm",
    "glass-dark":
      "bg-slate-900/80 backdrop-blur-xl border border-slate-800 text-white shadow-sm",
    gradient: "bg-gradient-to-br from-white to-slate-50 border border-slate-200 text-slate-800 shadow-sm",
  };
  
  const hoverStyles = hover
    ? "transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-slate-300"
    : "";
  
  const Component = animate ? motion.div : "div";
  
  const animationProps = animate
    ? {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
      }
    : {};

  return (
    <Component
      className={`rounded-2xl ${padding} relative overflow-hidden ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...animationProps}
      {...props}
    >
      {children}
    </Component>
  );
};
