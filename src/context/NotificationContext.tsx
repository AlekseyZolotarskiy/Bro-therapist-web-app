import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export type NotificationType = 'info' | 'warning' | 'success';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-lg border min-w-[300px] max-w-md bg-white",
                n.type === 'info' && "border-indigo-100 text-indigo-900",
                n.type === 'warning' && "border-amber-100 text-amber-900",
                n.type === 'success' && "border-emerald-100 text-emerald-900"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                n.type === 'info' && "bg-indigo-50 text-indigo-600",
                n.type === 'warning' && "bg-amber-50 text-amber-600",
                n.type === 'success' && "bg-emerald-50 text-emerald-600"
              )}>
                {n.type === 'info' && <Info size={20} />}
                {n.type === 'warning' && <AlertTriangle size={20} />}
                {n.type === 'success' && <CheckCircle size={20} />}
              </div>
              <p className="flex-1 text-sm font-medium">{n.message}</p>
              <button 
                onClick={() => removeNotification(n.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
