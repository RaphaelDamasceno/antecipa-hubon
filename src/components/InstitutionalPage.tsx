import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Globe, ArrowLeft, ShieldCheck, Target, Users } from 'lucide-react';
import Footer from './Footer';

interface InstitutionalPageProps {
  onBack: () => void;
}

export default function InstitutionalPage({ onBack }: InstitutionalPageProps) {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black/5 selection:text-black">
      {/* Navbar / Header */}
      <nav className="border-b border-black/5 p-6 md:p-8 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <img 
            src="https://i.postimg.cc/T3gMF7f5/ANTECIPA-LOGO-1-removebg-preview.png" 
            alt="Antecipa Logo" 
            className="h-12 w-auto object-contain" 
            referrerPolicy="no-referrer"
          />
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.2em] text-black/60 hover:text-black transition-colors"
        >
          <ArrowLeft size={14} /> Voltar para o Portal
        </button>
      </nav>

      {/* Hero Section */}
      <header className="p-8 md:p-24 bg-[#F9F9F9] border-b border-black/5">
        <div className="max-w-5xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-light tracking-tight mb-8 uppercase"
          >
            Sobre a <br/><span className="font-semibold italic">Antecipa.</span>
          </motion.h1>
          <p className="text-xl md:text-2xl text-black/60 max-w-2xl font-light leading-relaxed">
            Transformamos a liquidez de recebíveis em combustível para o crescimento do seu negócio.
          </p>
        </div>
      </header>

      {/* Content Sections */}
      <main className="p-8 md:p-24 space-y-32 max-w-5xl mx-auto">
        {/* Mission / Vision */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-sm">
              <Target size={24} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Nossa Missão</h3>
            <p className="text-sm text-black/60 leading-relaxed font-medium uppercase">
              Prover soluções financeiras ágeis e seguras, democratizando o acesso ao capital de giro para corretores e imobiliárias em todo o Brasil.
            </p>
          </div>
          <div className="space-y-6">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-sm">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Segurança</h3>
            <p className="text-sm text-black/60 leading-relaxed font-medium uppercase">
              Operamos com os mais altos padrões de compliance e tecnologia blockchain para garantir que cada transação seja imutável e transparente.
            </p>
          </div>
          <div className="space-y-6">
            <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-sm">
              <Users size={24} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Foco no Cliente</h3>
            <p className="text-sm text-black/60 leading-relaxed font-medium uppercase">
              Entendemos a dinâmica do mercado imobiliário e construímos ferramentas que simplificam o dia a dia de quem faz o mercado acontecer.
            </p>
          </div>
        </section>

        {/* Long Text */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start border-t border-black/10 pt-16">
          <div>
            <h2 className="text-4xl font-light mb-8 uppercase tracking-tight">Referência em <span className="font-bold">Antecipação</span></h2>
            <div className="space-y-6 text-black/70 leading-relaxed">
              <p>
                A Antecipa nasceu da necessidade de desburocratizar o setor financeiro para o mercado imobiliário. Sabemos que o fluxo de caixa é vital para a operação e crescimento, e as barreiras bancárias tradicionais muitas vezes impedem o progresso.
              </p>
              <p>
                Nossa plataforma conecta diretamente os recebíveis de comissões e vendas imobiliárias a fontes de capital seguras, permitindo que o dinheiro chegue onde ele é necessário em questão de horas, não semanas.
              </p>
            </div>
          </div>
          <div className="bg-black text-white p-12 rounded-sm space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-bold tracking-[0.4em] opacity-40">STATS</p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-3xl font-light">+R$ 500M</p>
                  <p className="text-[9px] uppercase tracking-widest opacity-40">Antecipados</p>
                </div>
                <div>
                  <p className="text-3xl font-light">12.4k</p>
                  <p className="text-[9px] uppercase tracking-widest opacity-40">Corretores</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-white/20"></div>
            <p className="text-xs leading-relaxed opacity-60 font-medium uppercase">
              "Tecnologia e confiança são os pilares que nos permitem transformar o futuro financeiro do setor imobiliário brasileiro."
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
