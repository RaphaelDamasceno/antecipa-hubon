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
}

export default function CollateralModal({ isOpen, onClose, primaryReceivable, availableReceivables, onConfirm }: CollateralModalProps) {
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
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 flex items-center gap-2">
              <Shield size={14} className="text-amber-500" /> Reforço de Garantia (Opcional)
            </h2>
            <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="bg-white/5 p-6 rounded-sm border border-white/5 mb-8">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Título a Antecipar</p>
                <p className="text-xl font-light text-white">{primaryReceivable.cliente}</p>
                <p className="text-[10px] text-white/20 mt-1 uppercase font-mono">PV: {primaryReceivable.id} • {primaryReceivable.previsaoMes}/{primaryReceivable.previsaoAno}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-light text-blue-400">{primaryReceivable.valor}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-white/60 flex items-center gap-2">
                Outros títulos disponíveis para garantia
              </h3>
              <span className="text-[9px] text-white/20 uppercase">{validCandidates.length} Candidatos</span>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-sm max-h-[300px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
              {validCandidates.length === 0 ? (
                <div className="p-12 text-center">
                  <Info size={24} className="mx-auto text-white/10 mb-3" />
                  <p className="text-[10px] uppercase tracking-widest text-white/20">Não há títulos de valor maior ou igual para oferecer como garantia.</p>
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
                        isSelected ? "bg-amber-500/10" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-5 h-5 rounded-sm border flex items-center justify-center transition-colors",
                          isSelected ? "bg-amber-500 border-amber-500 text-black" : "border-white/10 group-hover:border-white/20"
                        )}>
                          {isSelected && <CheckCircle2 size={14} />}
                        </div>
                        <div>
                          <p className="text-xs text-white/80 font-medium uppercase">{r.cliente}</p>
                          <p className="text-[9px] text-white/30 uppercase mt-0.5">PV: {r.id} • {r.previsaoMes}/{r.previsaoAno}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-light",
                          isSelected ? "text-amber-500" : "text-white/60"
                        )}>{r.valor}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <p className="text-[9px] text-white/20 leading-relaxed italic">
              <AlertCircle size={10} className="inline mr-1 mb-0.5" />
              Ao selecionar títulos em garantia, eles ficarão bloqueados para outras antecipações até que este processo seja concluído.
            </p>
          </div>

          <div className="flex gap-4 mt-10">
            <button 
              onClick={() => onConfirm([])}
              className="flex-1 border border-white/10 hover:bg-white/5 text-white/60 py-4 rounded-sm transition-all text-xs font-bold uppercase tracking-widest"
            >
              Prosseguir Sem Garantia
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-[2] bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-sm transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
            >
              Confirmar com {selectedIds.length} Garantia(s)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
