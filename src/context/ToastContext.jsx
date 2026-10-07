import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
const ToastContext = createContext(undefined);
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const showToast = useCallback(
    (message, type = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );
  const success = useCallback((msg) => showToast(msg, "success"), [showToast]);
  const error = useCallback((msg) => showToast(msg, "error"), [showToast]);
  const info = useCallback((msg) => showToast(msg, "info"), [showToast]);
  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-lg shadow-xl border text-sm font-medium transition-all duration-300 transform translate-y-0 ${
              toast.type === "success"
                ? "bg-indigo-900/95 text-white border-indigo-700/60 shadow-indigo-950/20"
                : toast.type === "error"
                  ? "bg-rose-950/95 text-rose-100 border-rose-800/60 shadow-rose-950/20"
                  : "bg-slate-900/95 text-white border-slate-700/60 shadow-slate-950/20"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
              )}
              {toast.type === "error" && (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              {toast.type === "info" && (
                <Info className="w-5 h-5 text-sky-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-slate-500 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
