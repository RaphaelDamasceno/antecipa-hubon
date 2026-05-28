import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, CheckCircle2, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { Receivable } from '../services/sheetsService';

interface CollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryReceivable: Receivable;
  availableReceivables: Receivable[];
  onConfirm: (collateral: Receivable[]) => void;
  theme?: 'dark' | 'light';
}

export default function CollateralModal({ isOpen, onClose, primaryReceivable, availableReceivables, onConfirm, theme = 'dark' }: CollateralModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtra títulos que podem servir de garantia
  // Regra: valor >= valor do título primário
  const validCandidates = availableReceivables.filter(r => {
    const isDifferent = r.id !== primaryReceivable.id || 
                       r.previsaoMes !== primaryReceivable.previsaoMes || 
                       r.previsaoAno !== primaryReceivable.previsaoAno;
    return isDifferent && r.valorNumeric >= primaryReceivable.valorNumeric;
  });

  const toggleSelection = (r: Receivable) => {
    const uid = r.receivableId;
    setSelectedIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleConfirm = () => {
    const selected = validCandidates.filter(r => 
      selectedIds.includes(r.receivableId)
    );
    onConfirm(selected);
    onClose();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          theme === 'dark' ? "bg-black/90 backdrop-blur-md" : "bg-slate-900/30 backdrop-blur-sm"
        )}
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "relative w-full max-w-2xl border rounded-sm overflow-hidden shadow-2xl transition-all duration-300",
          theme === 'dark' ? "bg-[#0a0a0a] border-white/10" : "bg-white border-slate-200"
        )}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className={cn(
              "text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-2 transition-colors",
              theme === 'dark' ? "text-white/40" : "text-slate-500 font-extrabold"
            )}>
              <Shield size={14} className="text-amber-500" /> Reforço de Garantia (Opcional)
            </h2>
            <button onClick={onClose} className={cn("transition-colors cursor-pointer", theme === 'dark' ? "text-white/20 hover:text-white" : "text-slate-400 hover:text-slate-800")}>
              <X size={20} />
            </button>
          </div>

          <div className={cn(
            "p-6 rounded-sm border transition-all duration-300 mb-8",
            theme === 'dark' ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-200/60 shadow-sm"
          )}>
            <div className="flex justify-between items-end">
              <div>
                <p className={cn("text-[9px] uppercase tracking-widest mb-1", theme === 'dark' ? "text-white/40" : "text-slate-500 font-semibold")}>Título a Antecipar</p>
                <p className={cn("text-xl font-light", theme === 'dark' ? "text-white" : "text-slate-805")}>{primaryReceivable.cliente}</p>
                <p className={cn("text-[10px] mt-1 uppercase font-mono", theme === 'dark' ? "text-white/20" : "text-slate-400")}>PV: {primaryReceivable.id} • {primaryReceivable.previsaoMes}/{primaryReceivable.previsaoAno}</p>
              </div>
              <div className="text-right">
                <p className={cn("text-2xl font-light", theme === 'dark' ? "text-blue-400" : "text-blue-600 font-normal")}>{primaryReceivable.valor}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={cn(
                "text-[10px] uppercase font-bold tracking-widest flex items-center gap-2",
                theme === 'dark' ? "text-white/60" : "text-slate-600"
              )}>
                Outros títulos disponíveis para garantia
              </h3>
              <span className={cn("text-[9px] uppercase", theme === 'dark' ? "text-white/20" : "text-slate-400")}>{validCandidates.length} Candidatos</span>
            </div>

            <div className={cn(
              "border rounded-sm max-h-[300px] overflow-y-auto divide-y custom-scrollbar transition-colors duration-300",
              theme === 'dark' ? "bg-[#111] border-white/5 divide-white/5" : "bg-slate-50 border-slate-200 divide-slate-200"
            )}>
              {validCandidates.length === 0 ? (
                <div className="p-12 text-center">
                  <Info size={24} className={cn("mx-auto mb-3", theme === 'dark' ? "text-white/10" : "text-slate-300")} />
                  <p className={cn("text-[10px] uppercase tracking-widest", theme === 'dark' ? "text-white/20" : "text-slate-400 font-medium")}>Não há títulos de valor maior ou igual para oferecer como garantia.</p>
                </div>
              ) : (
                validCandidates.map((r, idx) => {
                  const uid = r.receivableId;
                  const isSelected = selectedIds.includes(uid);
                  return (
                    <div 
                      key={uid}
                      onClick={() => toggleSelection(r)}
                      className={cn(
                        "p-4 flex items-center justify-between cursor-pointer transition-colors group",
                        isSelected 
                          ? (theme === 'dark' ? "bg-amber-500/10" : "bg-amber-50") 
                          : (theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-100/50")
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-5 h-5 rounded-sm border flex items-center justify-center transition-colors",
                          isSelected 
                            ? "bg-amber-500 border-amber-500 text-black" 
                            : (theme === 'dark' ? "border-white/10 group-hover:border-white/20" : "border-slate-300 group-hover:border-slate-400")
                        )}>
                          {isSelected && <CheckCircle2 size={14} />}
                        </div>
                        <div>
                          <p className={cn("text-xs font-medium uppercase", theme === 'dark' ? "text-white/80" : "text-slate-700")}>{r.cliente}</p>
                          <p className={cn("text-[9px] uppercase mt-0.5", theme === 'dark' ? "text-white/30" : "text-slate-400")}>PV: {r.id} • {r.previsaoMes}/{r.previsaoAno}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-light",
                          isSelected ? (theme === 'dark' ? "text-amber-500" : "text-amber-700 font-medium") : (theme === 'dark' ? "text-white/60" : "text-slate-650")
                        )}>{r.valor}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <p className={cn("text-[9px] leading-relaxed italic transition-colors", theme === 'dark' ? "text-white/20" : "text-slate-500")}>
              <AlertCircle size={10} className="inline mr-1 mb-0.5" />
              Ao selecionar títulos em garantia, eles ficarão bloqueados para outras antecipações até que este processo seja concluído.
            </p>
          </div>

          <div className="flex gap-4 mt-10">
            <button 
              onClick={() => onConfirm([])}
              className={cn(
                "flex-1 border py-4 rounded-sm transition-all text-xs font-bold uppercase tracking-widest cursor-pointer",
                theme === 'dark' 
                  ? "border-white/10 hover:bg-white/5 text-white/60" 
                  : "border-slate-300 bg-white text-slate-650 hover:bg-slate-50 shadow-sm hover:border-slate-400"
              )}
            >
              Prosseguir Sem Garantia
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-[2] bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-sm transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Confirmar com {selectedIds.length} Garantia(s)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
