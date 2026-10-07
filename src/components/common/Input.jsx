import React, { forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      icon: Icon,
      rightIcon,
      className = "",
      id,
      ...props
    },
    ref,
  ) => {
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    
    const resolvedLeftIcon = leftIcon ? (
      leftIcon
    ) : Icon ? (
      <Icon className="w-4 h-4" />
    ) : null;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center group">
          {resolvedLeftIcon && (
            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-primary-500 transition-colors pointer-events-none flex items-center">
              {resolvedLeftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-white hover:bg-slate-50/50 border text-slate-900 placeholder:text-slate-400 text-sm rounded-xl transition-all duration-300 ease-out py-2.5 shadow-xs hover:shadow-sm ${resolvedLeftIcon ? "pl-10" : "pl-3.5"} ${rightIcon ? "pr-10" : "pr-3.5"} ${error ? "border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" : "border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10"} outline-none ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-slate-400 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        <AnimatePresence>
          {(error || helperText) && (
            <motion.div
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className="overflow-hidden"
            >
              {error ? (
                <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5 mt-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              ) : helperText ? (
                <p className="text-xs text-slate-500 mt-1.5">{helperText}</p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

Input.displayName = "Input";
