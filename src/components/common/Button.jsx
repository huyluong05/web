import React from "react";
import { motion } from "motion/react";

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  icon: Icon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 relative overflow-hidden";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 min-h-[32px] text-xs rounded-xl gap-1.5",
    md: "px-4 py-2 min-h-[40px] text-sm rounded-xl gap-2",
    lg: "px-6 py-2.5 min-h-[48px] text-base rounded-xl gap-2.5",
  };
  
  const variantStyles = {
    primary:
      "bg-primary-600 hover:bg-primary-500 text-white shadow-sm shadow-primary-900/10 border border-transparent",
    secondary:
      "bg-slate-900 hover:bg-slate-800 text-white shadow-sm shadow-slate-900/10 border border-transparent",
    outline:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs",
    "outline-primary":
      "bg-transparent hover:bg-primary-50 text-primary-600 border border-primary-200",
    "outline-white":
      "bg-transparent hover:bg-white/10 text-white border border-white/30",
    white:
      "bg-white hover:bg-slate-50 text-slate-800 shadow-xs border border-slate-200",
    glass:
      "bg-white/70 backdrop-blur-md hover:bg-white/90 text-slate-800 border border-white/40 shadow-xs",
    "emerald-light":
      "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200",
    ghost:
      "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
    "ghost-white": "bg-transparent hover:bg-white/10 text-white",
    danger:
      "bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-900/10 border border-transparent",
  };

  const resolvedLeftIcon = leftIcon ? (
    leftIcon
  ) : Icon ? (
    <Icon className="w-4 h-4 shrink-0" />
  ) : null;

  return (
    <motion.button
      whileTap={!(disabled || isLoading) ? { scale: 0.97 } : {}}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      <span className="relative flex items-center gap-inherit">
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          resolvedLeftIcon
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </span>
    </motion.button>
  );
};
