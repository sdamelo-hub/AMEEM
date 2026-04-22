import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';

interface Toast { id: string; message: string; type: 'success' | 'danger' | 'info'; }
interface ToastContextType { showToast: (msg: string, type?: Toast['type']) => void; }

const ToastContext = createContext<ToastContextType | null>(null);
export const useToast = () => useContext(ToastContext)!;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? '✅' : t.type === 'danger' ? '❌' : 'ℹ️'} {t.message}
        </div>
      ))}
    </ToastContext.Provider>
  );
}
