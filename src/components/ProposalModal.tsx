import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, ShieldCheck, FileText, Send, Loader2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { updateBitrixDealWithFile, rejectBitrixDeal } from '../services/bitrixService';
import { saveSignature, updateCommissionStatus } from '../services/firebaseService';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: {
    commissionId: string;
    pvId: string;
    valorLiberado: number;
    observacoes: string;
    itemDetails: any;
    dealId: string;
  };
  userInfo: {
    nome: string;
    cpf: string;
  };
  onSuccess: () => void;
}

export default function ProposalModal({ isOpen, onClose, proposal, userInfo, onSuccess }: ProposalModalProps) {
  const [step, setStep] = useState<'review' | 'sign' | 'loading' | 'success'>('review');
  const [formData, setFormData] = useState({
    nome: userInfo.nome,
    cpf: userInfo.cpf,
    endereco: '',
    concordo: false
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSign = async () => {
    setStep('loading');
    try {
      const date = new Date().toLocaleString('pt-BR');
      const ip = "127.0.0.1"; // Placeholder, idealmente viria de um serviço de IP
      const userAgent = navigator.userAgent;
      
      const contractText = `
        TERMO DE ACEITE DE ANTECIPAÇÃO DE COMISSÃO
        ------------------------------------------
        PROPOSTA ID: ${proposal.dealId}
        PV: ${proposal.pvId}
        DATA: ${date}
        
        VALOR LIBERADO: ${formatCurrency(proposal.valorLiberado)}
        OBSERVAÇÕES: ${proposal.observacoes}
        
        SIGNATÁRIO: ${formData.nome}
        CPF: ${formData.cpf}
        ENDEREÇO: ${formData.endereco}
        IP DE ORIGEM: ${ip}
        DISPOSITIVO: ${userAgent}
        
        Ao assinar este documento, o signatário concorda com os valores e condições 
        estabelecidos na análise de risco realizada.
      `;
      
      const base64Content = btoa(unescape(encodeURIComponent(contractText)));
      const fileName = `Termo_Assinado_PV${proposal.pvId}.txt`;

      // 2. Enviar para o Bitrix
      await updateBitrixDealWithFile(proposal.dealId, base64Content, fileName);

      // 3. Salvar no Firestore para validade legal
      await saveSignature(proposal.commissionId, {
        name: formData.nome,
        document: formData.cpf,
        address: formData.endereco,
        ip,
        userAgent
      });

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Erro no fluxo de assinatura:', error);
      alert('Erro ao processar assinatura. Tente novamente.');
      setStep('sign');
    }
  };

  const handleReject = async () => {
    if (!confirm('Tem certeza que deseja recusar esta proposta? O processo será encerrado.')) return;
    
    setStep('loading');
    try {
      await rejectBitrixDeal(proposal.dealId);
      await updateCommissionStatus(proposal.commissionId, 'rejected', 'Garantia Negada pelo Usuário');
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao recusar proposta:', error);
      alert('Erro ao recusar proposta. Tente novamente.');
      setStep('review');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={step !== 'loading' ? onClose : undefined}
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-sm overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-500" /> Confirmação de Proposta
            </h2>
            {step !== 'loading' && (
              <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                <X size={20} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {step === 'review' && (
              <motion.div 
                key="review"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="bg-white/5 p-6 rounded-sm border border-white/5">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Valor Liberado para Adiantamento</p>
                  <p className="text-3xl font-light text-blue-400">{formatCurrency(proposal.valorLiberado)}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-white/60 mb-2">Observações da Análise</h4>
                    <div className="text-sm text-white/40 leading-relaxed bg-[#111] p-4 border border-white/5 select-none italic">
                      "{proposal.observacoes || 'Nenhuma observação específica registrada.'}"
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={handleReject}
                    className="flex-1 border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 py-4 rounded-sm transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                  >
                    <XCircle size={16} /> Recusar Proposta
                  </button>
                  <button 
                    onClick={() => setStep('sign')}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-sm transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                  >
                    <FileText size={16} /> Analisar Termo e Assinar
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'sign' && (
              <motion.div 
                key="sign"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="max-h-[200px] overflow-y-auto mb-6 p-4 bg-[#111] border border-white/5 text-[11px] text-white/30 font-mono leading-relaxed">
                  <p className="font-bold text-white/60 mb-4 uppercase text-center">Termo de Aceite Eletrônico</p>
                  Eu, {formData.nome}, portador do CPF {formData.cpf}, declaro sob as penas da lei que concordo 
                  integralmente com a proposta de antecipação apresentada. Autorizo a retenção do valor de 
                  {formatCurrency(proposal.valorLiberado)} sobre meus recebíveis futuros correspondentes à PV {proposal.pvId}.
                  A presente assinatura tem validade jurídica nos termos da MP 2.200-2/2001.
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-white/30 font-bold tracking-widest">Nome Completo</label>
                      <input 
                        type="text" 
                        value={formData.nome}
                        readOnly
                        className="w-full bg-white/5 border border-white/10 p-3 text-sm text-white/60 rounded-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-white/30 font-bold tracking-widest">Documento (CPF)</label>
                      <input 
                        type="text" 
                        value={formData.cpf}
                        readOnly
                        className="w-full bg-white/5 border border-white/10 p-3 text-sm text-white/60 rounded-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-white/30 font-bold tracking-widest">Endereço Residencial Completo</label>
                    <input 
                      type="text" 
                      placeholder="Rua, Número, Complemento, Bairro, Cidade - UF"
                      value={formData.endereco}
                      onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 p-3 text-sm text-white focus:border-blue-500/50 rounded-sm outline-none transition-colors"
                    />
                  </div>

                  <label className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-sm cursor-pointer hover:bg-blue-500/10 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={formData.concordo}
                      onChange={(e) => setFormData(prev => ({ ...prev, concordo: e.target.checked }))}
                      className="mt-1"
                    />
                    <span className="text-[11px] leading-relaxed text-white/60">
                      Declaro que li e concordo com os termos da análise de risco e autorizo o processamento imediato desta garantia.
                    </span>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('review')}
                    className="flex-1 border border-white/10 hover:bg-white/5 text-white/60 py-4 rounded-sm transition-all text-xs font-bold uppercase tracking-widest"
                  >
                    Voltar
                  </button>
                  <button 
                    disabled={!formData.concordo || !formData.endereco.trim()}
                    onClick={handleSign}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white py-4 rounded-sm transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                  >
                    <Send size={16} /> Emitir Assinatura Digital
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'loading' && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
                <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/40">Autenticando Documento...</p>
                <p className="text-[9px] uppercase tracking-widest text-white/20 mt-2">Registrando Operação e Blockchain Local</p>
              </div>
            )}

            {step === 'success' && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Assinatura Concluída</h3>
                <p className="text-sm text-white/40">Seu termo foi anexado à negociação e o processo seguirá para finalização.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
