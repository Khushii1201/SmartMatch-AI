import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        const borderColor = isSuccess
          ? 'border-emerald-500/30'
          : isError
          ? 'border-rose-500/30'
          : 'border-indigo-500/30';

        const bgColor = isSuccess
          ? 'bg-slate-900/95 text-emerald-300'
          : isError
          ? 'bg-slate-900/95 text-rose-300'
          : 'bg-slate-900/95 text-indigo-300';

        const icon = isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : isError ? (
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
        ) : (
          <Info className="w-5 h-5 text-indigo-400 shrink-0" />
        );

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl p-4 shadow-xl border backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${bgColor} ${borderColor}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-semibold text-white">{toast.title}</h5>
              {toast.message && (
                <p className="text-xs text-slate-300/80 mt-0.5 break-words">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
