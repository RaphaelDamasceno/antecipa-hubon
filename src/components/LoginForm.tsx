import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, User, Calendar, CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authenticateUser } from '../services/sheetsService';
import { cn } from '../lib/utils';

interface LoginFormProps {
  onLoginSuccess: (userInfo: { nome: string; dataNascimento: string; cpf: string }) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState({
    nome: '',
    dataNascimento: '',
    cpf: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatDate = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\/\d{4})\d+?$/, '$1');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') formattedValue = formatCPF(value);
    if (name === 'dataNascimento') formattedValue = formatDate(value);

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.dataNascimento || !formData.cpf) {
      setErrorMessage('Por favor, preencha todos os campos.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const foundUser = await authenticateUser(
        formData.nome,
        formData.dataNascimento,
        formData.cpf
      );

      if (foundUser) {
        setStatus('success');
        setTimeout(() => {
          onLoginSuccess(foundUser);
        }, 1000);
      } else {
        setErrorMessage('Dados não encontrados ou incorretos. Verifique as informações e tente novamente.');
        setStatus('error');
      }
    } catch (error) {
      setErrorMessage('Ocorreu um erro ao validar seus dados. Tente novamente mais tarde.');
      setStatus('error');
    }
  };

  return (
    <div className="w-full max-w-lg">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="overflow-hidden"
      >
        <div className="mb-12">
          <h2 className="text-3xl font-semibold mb-3 tracking-tight">Autenticação</h2>
          <p className="text-sm text-white/40 tracking-wide font-medium">Preencha os campos abaixo para validar seu acesso ao Portal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase tracking-[0.25em] font-bold text-white/40 ml-0.5">Nome Completo</label>
            <div className="relative">
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 px-5 py-5 rounded-sm focus:outline-none focus:border-white/40 focus:bg-white/[0.08] transition-all text-sm uppercase tracking-wider placeholder:text-white/10"
                placeholder="EX: JOÃO DA SILVA SANTOS"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-[0.25em] font-bold text-white/40 ml-0.5">Data de Nascimento</label>
              <div className="relative">
                <input
                  type="text"
                  name="dataNascimento"
                  value={formData.dataNascimento}
                  onChange={handleInputChange}
                  maxLength={10}
                  className="w-full bg-white/5 border border-white/10 px-5 py-5 rounded-sm focus:outline-none focus:border-white/40 focus:bg-white/[0.08] transition-all text-sm tracking-widest placeholder:text-white/10"
                  placeholder="00/00/0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-[0.25em] font-bold text-white/40 ml-0.5">CPF</label>
              <div className="relative">
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  maxLength={14}
                  className="w-full bg-white/5 border border-white/10 px-5 py-5 rounded-sm focus:outline-none focus:border-white/40 focus:bg-white/[0.08] transition-all text-sm tracking-widest placeholder:text-white/10"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 text-rose-400 bg-rose-500/5 p-4 border border-rose-500/20"
              >
                <AlertCircle size={16} className="shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{errorMessage}</span>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 text-emerald-400 bg-emerald-500/5 p-4 border border-emerald-500/20"
              >
                <CheckCircle2 size={16} className="shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Acesso autorizado. Carregando dashboard...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4">
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className={cn(
                "w-full py-6 font-bold uppercase tracking-[0.3em] text-[11px] transition-all flex items-center justify-center gap-3 rounded-sm",
                status === 'loading' 
                  ? "bg-white/10 text-white/40 cursor-not-allowed" 
                  : "bg-white text-[#0A0A0A] hover:bg-white/90 active:scale-[0.99] shadow-[0_0_30px_rgba(255,255,255,0.05)]"
              )}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Validando Identidade</span>
                </>
              ) : (
                <>
                  <span>Validar Identidade</span>
                  <LogIn size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-16 flex justify-between items-center opacity-30">
          <div className="flex gap-8">
            <a href="#" className="text-[9px] uppercase tracking-widest font-bold hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="text-[9px] uppercase tracking-widest font-bold hover:text-white transition-colors">Termos</a>
          </div>
          <div className="text-[9px] font-mono tracking-tighter">
            V.1.02.4
          </div>
        </div>
      </motion.div>
    </div>
  );
}
