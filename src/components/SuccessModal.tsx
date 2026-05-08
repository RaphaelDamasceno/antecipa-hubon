import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasCollateral: boolean;
}

export default function SuccessModal({ isOpen, onClose, hasCollateral }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="p-10 text-center">
          <div className="flex justify-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.1 }}
              className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500"
            >
              <CheckCircle2 size={40} />
            </motion.div>
          </div>

          <h3 className="text-xl font-bold uppercase tracking-[0.2em] mb-4 text-white">Solicitação Enviada</h3>
          <p className="text-sm text-white/40 leading-relaxed mb-8">
            Sua solicitação de antecipação foi encaminhada com sucesso e já está em fila de processamento.
          </p>

          {!hasCollateral ? (
            <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-sm mb-8 text-left">
              <div className="flex items-start gap-4">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Aviso Importante</p>
                  <p className="text-[11px] text-amber-500/80 leading-relaxed uppercase font-medium">
                    Solicitações sem garantia adicional podem ser <span className="font-bold underline decoration-2">negadas por análise de risco</span> ou <span className="font-bold underline decoration-2">perder prioridade</span> na fila de adiantamentos.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-sm mb-8 text-left">
              <div className="flex items-start gap-4">
                <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Garantia Atrelada</p>
                  <p className="text-[11px] text-emerald-500/80 leading-relaxed uppercase font-medium">
                    O uso de títulos em garantia aumenta a segurança da operação e garante maior prioridade no processamento da sua solicitação.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full bg-white text-black py-4 rounded-sm text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/90 transition-all"
          >
            Entendido
          </button>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </motion.div>
    </div>
  );
}
