import { Mail, Phone, MapPin, Globe, Linkedin, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] text-white p-12 md:p-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        {/* Brand & CNPJ */}
        <div className="space-y-8 md:col-span-1">
          <img 
            src="https://i.postimg.cc/T3gMF7f5/ANTECIPA-LOGO-1-removebg-preview.png" 
            alt="Antecipa Logo" 
            className="h-16 w-auto object-contain brightness-0 invert" 
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-2">Razão Social</p>
            <p className="text-xs uppercase font-medium">Antecipa Soluções Financeiras Ltda</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-2">CNPJ</p>
            <p className="text-xs font-mono">12.670.349/0001-10</p>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-8 col-span-1">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Fale Conosco</h4>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 group cursor-pointer">
              <Mail size={16} className="text-white/20 group-hover:text-white transition-colors" />
              <span className="text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">contato@antecipa.com.br</span>
            </li>
            <li className="flex items-center gap-3 group cursor-pointer">
              <Phone size={16} className="text-white/20 group-hover:text-white transition-colors" />
              <span className="text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">+55 (11) 4003-4567</span>
            </li>
            <li className="flex items-center gap-3 group cursor-pointer">
              <MapPin size={16} className="text-white/20 group-hover:text-white transition-colors" />
              <span className="text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">Av. Paulista, 1000 - São Paulo, SP</span>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="space-y-8 col-span-1">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Portal</h4>
          <ul className="space-y-4">
            <li className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity cursor-pointer uppercase tracking-widest">Termos de Uso</li>
            <li className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity cursor-pointer uppercase tracking-widest">Privacidade</li>
            <li className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity cursor-pointer uppercase tracking-widest">Compliance</li>
            <li className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity cursor-pointer uppercase tracking-widest">LGPD</li>
          </ul>
        </div>

        {/* Social */}
        <div className="space-y-8 col-span-1">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Social</h4>
          <div className="flex gap-4">
            <div className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer transition-colors rounded-sm">
              <Linkedin size={18} />
            </div>
            <div className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer transition-colors rounded-sm">
              <Instagram size={18} />
            </div>
            <div className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer transition-colors rounded-sm">
              <Facebook size={18} />
            </div>
          </div>
          <p className="text-[9px] text-white/20 leading-relaxed uppercase tracking-widest leading-loose">
            Antecipa 2026<br/>
            Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
