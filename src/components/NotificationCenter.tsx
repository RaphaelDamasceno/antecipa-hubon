import { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, Info, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToNotifications, markNotificationAsRead, deleteNotification } from '../services/firebaseService';
import { cn } from '../lib/utils';

interface NotificationCenterProps {
  userId: string;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, (data) => {
      setNotifications(data);
    });
    return () => unsubscribe();
  }, [userId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'error': return <AlertCircle className="text-rose-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/40 hover:text-white transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-[320px] max-h-[480px] bg-[#0a0a0a] border border-white/10 rounded-sm shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/2">
                <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/60">Notificações</h3>
                <span className="text-[9px] text-white/20 uppercase font-bold">{notifications.length} total</span>
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="mx-auto text-white/10 mb-3" size={32} />
                    <p className="text-[10px] uppercase tracking-widest text-white/20">Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={cn(
                          "p-4 transition-colors group relative",
                          !n.read ? "bg-blue-500/5" : "hover:bg-white/2"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="mt-1">{getIcon(n.type)}</div>
                          <div className="flex-1 space-y-1">
                            <h4 className={cn("text-[11px] font-bold", !n.read ? "text-white" : "text-white/60")}>
                              {n.title}
                            </h4>
                            <p className="text-[10px] text-white/40 leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-[8px] text-white/20 uppercase font-mono">
                              {n.createdAt?.toDate().toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {!n.read && (
                            <button 
                              onClick={() => markNotificationAsRead(n.id)}
                              className="p-1.5 text-emerald-500/60 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-sm"
                              title="Marcar como lida"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(n.id)}
                            className="p-1.5 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-sm"
                            title="Excluir"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
