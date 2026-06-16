/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Shield, LogIn, ArrowRight, Sun, Moon, Lock, ShieldAlert, Key, HelpCircle, Sparkles } from 'lucide-react';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import InstitutionalPage from './components/InstitutionalPage';
import { UserAuth } from './services/bitrixService';
import { cn } from './lib/utils';
import { auth, onAuthStateChanged, signInWithGoogle, User } from './services/firebaseService';

export default function App() {
  const [userAuthData, setUserAuthData] = useState<UserAuth | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'main' | 'institutional'>('main');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('antecipa_theme') as 'light' | 'dark') || 'dark';
  });

  const [isAccessAllowed, setIsAccessAllowed] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('ref') || params.get('src');
    const referrer = document.referrer?.toLowerCase() || '';
    
    const hasValidToken = token === 'antecipa_portal' || token === 'secure_btn' || token === 'bitrix' || token === 'app_empresa' || token === 'sistema_interno';
    const hasValidReferrer = referrer.includes('bitrix') || referrer.includes('crm') || referrer.includes('antecipabroker') || referrer.includes('meuapp') || referrer.includes('app-empresa');
    const hasSessionAllowed = sessionStorage.getItem('portal_access_allowed') === 'true';
    
    if (hasValidToken || hasValidReferrer || hasSessionAllowed) {
      sessionStorage.setItem('portal_access_allowed', 'true');
      return true;
    }
    return false;
  });

  const [simulationToken, setSimulationToken] = useState('');
  const [errorSimulation, setErrorSimulation] = useState(false);

  const handleSimulateAccess = (token: string) => {
    if (token === 'antecipa_portal' || token === 'secure_btn' || token === 'bitrix' || token === 'app_empresa' || token === 'sistema_interno') {
      sessionStorage.setItem('portal_access_allowed', 'true');
      setIsAccessAllowed(true);
      setErrorSimulation(false);
    } else {
      setErrorSimulation(true);
      setTimeout(() => setErrorSimulation(false), 3000);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('antecipa_theme', newTheme);
  };

  const handleLoginSuccess = (userInfo: UserAuth) => {
    setUserAuthData(userInfo);
  };

  const handleLogout = () => {
    setUserAuthData(null);
    auth.signOut();
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Falha no login Google', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Shield className="animate-pulse text-white/20" size={48} />
      </div>
    );
  }

  if (!isAccessAllowed) {
    return (
      <div className={cn(
        "min-h-screen font-sans flex flex-col items-center justify-center p-6 transition-colors duration-300 w-full relative overflow-hidden",
        theme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F4F4F6] text-slate-900"
      )}>
        {/* Theme Toggle in Lock Screen */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={toggleTheme}
            className={cn(
              "p-3 border rounded-sm transition-all active:scale-95 flex items-center justify-center",
              theme === 'dark' 
                ? "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white" 
                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
            )}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "w-full max-w-xl rounded-sm p-8 md:p-12 relative overflow-hidden border shadow-2xl transition-all duration-300 z-10",
            theme === 'dark' 
              ? "bg-[#111111]/90 border-white/5" 
              : "bg-white border-slate-200"
          )}
        >
          {/* Top glowing Lock Icon */}
          <div className="flex justify-center mb-8">
            <div className={cn(
              "p-4 rounded-full relative flex items-center justify-center transition-colors",
              theme === 'dark' ? "bg-rose-500/10 text-rose-500" : "bg-rose-50 text-rose-500"
            )}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500/20 opacity-75"></span>
              <Lock size={32} strokeWidth={1.5} />
            </div>
          </div>

          <div className="text-center space-y-4 mb-4">
            <span className={cn(
              "text-[9px] uppercase tracking-[0.4em] font-bold block",
              theme === 'dark' ? "text-rose-400" : "text-rose-500"
            )}>
              AMBIENTE DE INTEGRACAO EXTERNA
            </span>
            <h1 className="text-2xl md:text-3xl font-light uppercase tracking-tight">
              Acesso <span className="font-semibold">Bloqueado</span>
            </h1>
            <p className={cn(
              "text-xs leading-relaxed max-w-md mx-auto",
              theme === 'dark' ? "text-white/50" : "text-slate-500"
            )}>
              Sua plataforma foi configurada para ser aberta <strong>exclusivamente a partir do aplicativo da sua empresa</strong>. O acesso avulso está restrito para integridade de dados.
            </p>
          </div>

          <div className={cn(
            "border-t border-b py-6 mb-8 space-y-4",
            theme === 'dark' ? "border-white/5" : "border-slate-100"
          )}>
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-bold">Por que isso acontece?</h4>
                <p className={cn(
                  "text-[11px] leading-relaxed mt-1",
                  theme === 'dark' ? "text-white/40" : "text-slate-500"
                )}>
                  Para garantir segurança cibernética e sincronizar as negociações de forma segura, o sistema exige que os corretores venham de um fluxo autenticado/redirecionado das ferramentas integradas da empresa.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <HelpCircle className={cn("shrink-0 mt-0.5", theme === 'dark' ? "text-blue-400" : "text-blue-500")} size={16} />
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-bold">Como configurar o botão no App da sua Empresa:</h4>
                <p className={cn(
                  "text-[11px] leading-relaxed mt-1 mb-2",
                  theme === 'dark' ? "text-white/40" : "text-slate-500"
                )}>
                  Defina a URL de destino com o token seguro no seu aplicativo:
                </p>
                <div className={cn(
                  "p-3 rounded-sm text-[10px] font-mono select-all overflow-x-auto border mb-3",
                  theme === 'dark' 
                    ? "bg-[#090909] border-white/5 text-blue-300" 
                    : "bg-slate-50 border-slate-200 text-blue-600 font-semibold"
                )}>
                  {window.location.origin}/?token=app_empresa
                </div>

                <p className={cn(
                  "text-[10px] italic leading-relaxed",
                  theme === 'dark' ? "text-white/30" : "text-slate-400"
                )}>
                  Exemplo de código no botão do seu App:
                </p>
                <div className={cn(
                  "p-3 rounded-sm text-[9px] font-mono select-all overflow-x-auto border mt-1",
                  theme === 'dark' 
                    ? "bg-[#050505] border-white/5 text-emerald-400/90" 
                    : "bg-slate-100 border-slate-200 text-emerald-700 font-medium"
                )}>
                  {`<a href="${window.location.origin}/?token=app_empresa" className="btn-acesso">
  Abrir Antecipa Portal
</a>`}
                </div>
              </div>
            </div>
          </div>

          {/* SIMULATOR */}
          <div className={cn(
            "p-5 rounded-sm border",
            theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-150"
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Key size={14} className="text-amber-500" />
              <span className="text-[10px] uppercase tracking-wider font-bold">Simulação e Testes Locally</span>
            </div>
            
            <p className={cn(
              "text-[11px] mb-4 leading-relaxed",
              theme === 'dark' ? "text-white/45" : "text-slate-500"
            )}>
              Cole o query token abaixo para simular o redirecionamento ou ative o facilitador no botão inteligente abaixo:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex e.g. app_empresa"
                value={simulationToken}
                onChange={(e) => setSimulationToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSimulateAccess(simulationToken)}
                className={cn(
                  "flex-1 p-2.5 text-xs rounded-sm outline-none border transition-colors",
                  theme === 'dark'
                    ? "bg-[#0A0A0A] border-white/10 text-white focus:border-white/30"
                    : "bg-white border-slate-350 text-slate-800 focus:border-slate-500"
                )}
              />
              <button
                onClick={() => handleSimulateAccess(simulationToken)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-sm text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0"
              >
                Ativar
              </button>
            </div>

            {errorSimulation && (
              <p className="text-[10px] text-rose-500 font-bold mt-2 uppercase tracking-wider animate-pulse">
                Token inválido ou incorreto. Use "app_empresa".
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-white/5 flex flex-col gap-2">
              <button
                onClick={() => handleSimulateAccess('app_empresa')}
                className={cn(
                  "text-[10px] w-full py-2.5 px-3 rounded-sm border transition-all active:scale-95 flex items-center justify-center gap-1.5 font-bold uppercase tracking-widest",
                  theme === 'dark'
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                )}
              >
                <Sparkles size={11} /> Simular Clique no Botão do Meu App (token=app_empresa)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const isFullyAuthenticated = firebaseUser && userAuthData;

  return (
    <div className={cn(
      "min-h-screen font-sans overflow-hidden flex flex-col md:flex-row transition-colors duration-300 w-full",
      theme === 'dark' || !isFullyAuthenticated 
        ? "bg-[#0A0A0A] text-white selection:bg-white/20 selection:text-white" 
        : "bg-[#F4F4F6] text-slate-900 selection:bg-slate-200 selection:text-slate-900"
    )}>
      {/* Decorative Background Elements */}
      <div className="fixed top-0 right-0 p-8 z-0 pointer-events-none opacity-20 hidden md:block">
        <div className="text-[10px] font-mono text-white/40 rotate-90 origin-right tracking-widest leading-none">
          LAT: -23.5505 | LONG: -46.6333
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        {currentView === 'institutional' ? (
          <motion.div
            key="institutional"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <InstitutionalPage onBack={() => setCurrentView('main')} />
          </motion.div>
        ) : !isFullyAuthenticated ? (
          <motion.div
            key="login-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col md:flex-row w-full h-full min-h-screen"
          >
            {/* Left Sidebar / Brand Pane */}
            <div className="w-full md:w-[600px] bg-white border-r border-black/5 p-8 md:p-16 flex flex-col justify-between shrink-0">
              <div className="flex items-center">
                <img 
                  src="https://i.postimg.cc/T3gMF7f5/ANTECIPA-LOGO-1-removebg-preview.png" 
                  alt="Antecipa Logo" 
                  className="h-24 w-auto object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="my-12 md:my-0">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-[54px] font-light leading-[1.1] mb-8 tracking-tight text-black uppercase"
                >
                  Acesso<br/><span className="font-semibold text-black/30 italic uppercase">Seguro</span><br/>Sincronizado.
                </motion.h1>
                <div className="flex items-center gap-6">
                  <div className="h-1 w-12 bg-black opacity-20"></div>
                  <button 
                    onClick={() => setCurrentView('institutional')}
                    className="text-[10px] font-bold uppercase tracking-[0.3em] text-black/40 hover:text-black transition-all flex items-center gap-2 group border-b border-black/5 hover:border-black/20 pb-1"
                  >
                    Sobre Nós & Contato
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {!firebaseUser ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest text-amber-600">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span>CONEXÃO SEGURA PENDENTE</span>
                    </div>
                    <button 
                      onClick={handleGoogleSignIn}
                      className="flex items-center justify-center gap-3 bg-[#0A0A0A] text-white py-5 text-[10px] uppercase tracking-[0.3em] font-bold rounded-sm border border-black hover:bg-black/90 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.1)] group"
                    >
                      <LogIn size={14} className="group-hover:translate-x-1 transition-transform" />
                      Login com Google
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest text-emerald-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span>GOOGLE AUTH: CONECTADO</span>
                  </div>
                )}
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 leading-relaxed font-medium">
                  Acesso restrito ao quadro de colaboradores. A autenticação Google é necessária para sincronização em tempo real.
                </p>
              </div>
            </div>

            {/* Main Login Pane */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-20 bg-[#0A0A0A]">
              <div className={!firebaseUser ? 'opacity-20 pointer-events-none grayscale' : ''}>
                 <LoginForm onLoginSuccess={handleLoginSuccess} />
                 {!firebaseUser && (
                   <div className="mt-8 text-center bg-white/5 border border-white/10 p-6 rounded-sm">
                     <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Faça login com Google primeiro para liberar o formulário.</p>
                   </div>
                 )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-layout"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center p-6 min-h-screen relative z-10 transition-colors duration-300",
              theme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F4F4F6] text-slate-900"
            )}
          >
            <div className={cn(
              "w-full max-w-5xl rounded-sm p-8 md:p-16 relative overflow-hidden transition-all duration-300",
              theme === 'dark' ? "bg-[#111111] border border-white/5" : "bg-white border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
            )}>
              {/* Absolutes for style */}
              <div className={cn(
                "absolute top-0 right-0 p-12 opacity-[0.03] transition-all duration-300",
                theme === 'dark' ? "text-white" : "text-slate-950"
              )}>
                <Shield size={320} strokeWidth={0.5} />
              </div>

              <div className="relative z-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                  <div>
                    <span className={cn(
                      "text-[10px] uppercase tracking-[0.4em] font-bold mb-4 block",
                      theme === 'dark' ? "text-white/40" : "text-slate-400"
                    )}>
                      Operações Sincronizadas
                    </span>
                    <h1 className={cn(
                      "text-4xl md:text-6xl font-light uppercase tracking-tight",
                      theme === 'dark' ? "text-white" : "text-slate-900"
                    )}>
                      Painel <span className={cn(
                        "font-semibold uppercase ml-2",
                        theme === 'dark' ? "text-white" : "text-slate-950"
                      )}>{userAuthData.nome.split(' ')[0]}</span>
                    </h1>
                    {userAuthData.allFields && (
                      <div className="mt-4 flex flex-wrap gap-2">
                         {userAuthData.allFields['Empresa'] && (
                           <span className={cn(
                             "text-[10px] px-2 py-1 font-bold uppercase tracking-widest border transition-colors",
                             theme === 'dark' 
                               ? "bg-white/5 border-white/10 text-white/50" 
                               : "bg-slate-100 border-slate-250 text-slate-600"
                           )}>
                             {userAuthData.allFields['Empresa']}
                           </span>
                         )}
                         {userAuthData.allFields['Cargo'] && (
                           <span className={cn(
                             "text-[10px] px-2 py-1 font-bold uppercase tracking-widest border transition-colors",
                             theme === 'dark'
                               ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                               : "bg-amber-50 border-amber-300/40 text-amber-700 font-semibold"
                           )}>
                             {userAuthData.allFields['Cargo']}
                           </span>
                         )}
                         {userAuthData.allFields['Superintendência'] && (
                           <span className={cn(
                             "text-[10px] px-2 py-1 font-bold uppercase tracking-widest border transition-colors",
                             theme === 'dark'
                               ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                               : "bg-blue-50 border-blue-300/40 text-blue-700 font-semibold"
                           )}>
                             {userAuthData.allFields['Superintendência']}
                           </span>
                         )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      onClick={toggleTheme}
                      className={cn(
                        "p-3 border rounded-sm transition-all active:scale-95 flex items-center justify-center",
                        theme === 'dark' 
                          ? "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white" 
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                      )}
                      aria-label="Alternar Tema"
                      title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                    >
                      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    </button>

                    <button 
                      onClick={handleLogout}
                      className={cn(
                        "flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all py-3 px-6 border rounded-sm active:scale-95",
                        theme === 'dark'
                          ? "border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950 shadow-sm"
                      )}
                    >
                      <LogOut size={14} />
                      Finalizar Sessão
                    </button>
                  </div>
                </header>

                <Dashboard 
                  userInfo={userAuthData} 
                  firebaseUserId={firebaseUser.uid} 
                  firebaseUserEmail={firebaseUser.email || ''} 
                  theme={theme}
                />
              </div>
            </div>

            <div className={cn(
              "mt-12 flex gap-12 border-t pt-8 w-full max-w-5xl justify-between transition-colors duration-300",
              theme === 'dark' ? "border-white/5" : "border-slate-200"
            )}>
               <div className="flex gap-8">
                 <span className={cn(
                   "text-[9px] uppercase tracking-[0.2em] transition-colors cursor-pointer",
                   theme === 'dark' ? "text-white/20 hover:text-white/40" : "text-slate-400 hover:text-slate-600"
                 )}>
                   Segurança Ativa
                 </span>
                 <span className={cn(
                   "text-[9px] uppercase tracking-[0.2em] transition-colors cursor-pointer",
                   theme === 'dark' ? "text-white/20 hover:text-white/40" : "text-slate-400 hover:text-slate-600"
                 )}>
                   {firebaseUser.email}
                 </span>
               </div>
               <span className={cn(
                 "text-[9px] uppercase tracking-[0.2em] font-mono",
                 theme === 'dark' ? "text-white/10" : "text-slate-300"
               )}>
                 ID: {firebaseUser.uid.slice(0, 8)}...
               </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

