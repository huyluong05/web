import React from "react";

export const Badge = ({
  children,
  variant = "primary",
  size = "md",
  dot = false,
  className = "",
}) => {
  /* Map old variants for backward compatibility */ 
  const resolvedVariant = variant === "emerald" || variant === "blue" ? "primary" : variant;
  
  const variantStyles = {
    primary: "bg-primary-50 text-primary-700 border-primary-200/60",
    secondary: "bg-secondary-50 text-secondary-700 border-secondary-200/60",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200/60",
    error: "bg-rose-50 text-rose-700 border-rose-200/60",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    info: "bg-sky-50 text-sky-700 border-sky-200/60",
    rose: "bg-rose-50 text-rose-700 border-rose-200/60",
  };
  
  const dotStyles = {
    primary: "bg-primary-500",
    secondary: "bg-secondary-500",
    slate: "bg-slate-400",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    success: "bg-emerald-500",
    info: "bg-sky-500",
    rose: "bg-rose-500",
  };
  
  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 font-semibold tracking-wide rounded-full",
    md: "text-xs px-2.5 py-0.5 font-semibold tracking-wide rounded-full",
    lg: "text-sm px-3 py-1 font-semibold tracking-wide rounded-full",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border whitespace-nowrap ${variantStyles[resolvedVariant] || variantStyles.slate} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotStyles[resolvedVariant] || dotStyles.slate}`}
        />
      )}
      {children}
    </span>
  );
};
