import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchReceivables, Receivable } from '../services/sheetsService';
import { createBitrixDeal, createMultipleBitrixDeals, fetchExistingDeals, mapBitrixStageToStatus, mapBitrixStageToLabel, PV_FIELD, BITRIX_FIELDS, UserAuth } from '../services/bitrixService';
import { savePromisedCommission, fetchPromisedCommissions, updateCommissionStatus, deletePromisedCommission, logAccess } from '../services/firebaseService';
import { Loader2, DollarSign, List, ArrowRight, Wallet, History, CheckCircle2, AlertCircle, Shield, Clock, RefreshCw, FileSignature, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import ProposalModal from './ProposalModal';
import NotificationCenter from './NotificationCenter';
import CollateralModal from './CollateralModal';
import SuccessModal from './SuccessModal';

interface DashboardProps {
  userInfo: UserAuth;
  firebaseUserId: string;
  firebaseUserEmail: string;
}

interface GroupedReceivable {
  id: string;
  items: Receivable[];
  totalAvailable: number;
  totalPromised: number;
  mainInfo: Receivable;
}

export default function Dashboard({ userInfo, firebaseUserId, firebaseUserEmail }: DashboardProps) {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error' | 'already'>>({});
  const [existingDeals, setExistingDeals] = useState<any[]>([]);
  const [promisedFromDb, setPromisedFromDb] = useState<any[]>([]);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [activeProposal, setActiveProposal] = useState<any>(null);
  
  const [isCollateralModalOpen, setIsCollateralModalOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ item: Receivable, uniqueId: string } | null>(null);
 
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [hasUsedCollateral, setHasUsedCollateral] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'available' | 'requested' | 'collateral'>('available');

  const getDbEntry = (item: Receivable) => {
    return promisedFromDb.find(p => 
      String(p.pvId) === String(item.id) && 
      String(p.previsaoMes) === String(item.previsaoMes) && 
      String(p.previsaoAno) === String(item.previsaoAno)
    );
  };

  const isActuallyRequested = (item: Receivable) => {
    const dbEntry = getDbEntry(item);
    if (!dbEntry) return false;
    if (dbEntry.status === 'rejected') return false;
    return !dbEntry.isCollateral;
  };

  const isActuallyCollateral = (item: Receivable) => {
    const dbEntry = getDbEntry(item);
    if (!dbEntry) return false;
    if (dbEntry.status === 'rejected') return false;
    return !!dbEntry.isCollateral;
  };

  const isActuallyAvailable = (item: Receivable) => {
    const isPago = item.status.toLowerCase().includes('pago');
    if (isPago) return false;
    const dbEntry = getDbEntry(item);
    if (!dbEntry) return true;
    return dbEntry.status === 'rejected';
  };
 
  async function syncAndLoad() {
    setLoading(true);
    try {
      // Log de auditoria de consulta
      logAccess(firebaseUserId, firebaseUserEmail, userInfo.nome, 'CONSULTA_COMISSOES');

      const [data, dbPromised] = await Promise.all([
        fetchReceivables(userInfo),
        fetchPromisedCommissions(firebaseUserId)
      ]);
      
      setReceivables(data);
      setPromisedFromDb(dbPromised);
      
      const pvIds = Array.from(new Set(data.map(r => r.id))) as string[];
      if (pvIds.length > 0) {
        const bitrixDeals = await fetchExistingDeals(pvIds);
        setExistingDeals(bitrixDeals);
        
        // Sincronizar Status Bitrix -> Firestore
        for (const dbComm of dbPromised) {
          const previsionPattern = `PREVISÃO: ${dbComm.previsaoMes}/${dbComm.previsaoAno}`;
          
          // Procura o deal no Bitrix correspondente à PV E à Parcela específica
          // Filtramos todos os possíveis matches e pegamos o de ID mais alto (mais recente)
          const matchingDeals = bitrixDeals.filter((d: any) => {
             const hasPV = String(d[PV_FIELD]) === String(dbComm.pvId);
             const comments = String(d.COMMENTS || '');
             const hasPrevision = comments.includes(previsionPattern);
             return hasPV && hasPrevision;
          });
          
          const relatedDeal = matchingDeals.sort((a, b) => Number(b.ID) - Number(a.ID))[0];
          
          if (relatedDeal) {
            const currentBitrixStatus = mapBitrixStageToStatus(relatedDeal.STAGE_ID);
            const currentBitrixLabel = mapBitrixStageToLabel(relatedDeal.STAGE_ID);
            // Se o status ou o rótulo no Bitrix mudou, atualizamos
            if (currentBitrixStatus !== dbComm.status || currentBitrixLabel !== dbComm.stageName) {
              await updateCommissionStatus(dbComm.receivableId, currentBitrixStatus, currentBitrixLabel);
            }
            
            // Caso especial: se o pai foi atualizado para rejected, o colateral deve ser liberado imediatamente
            if (dbComm.collateralFor && currentBitrixStatus === 'rejected') {
               await deletePromisedCommission(dbComm.receivableId);
            }
          } else {
            // SE NÃO EXISTE NO BITRIX (foi apagado pelo administrativo), removemos do Firestore
            // Para o usuário, se não está no Bitrix, não tem status (volta ao estado inicial)
            // A menos que seja um Título em Garantia, que depende do pai
            if (!dbComm.isCollateral) {
              await deletePromisedCommission(dbComm.receivableId);
            } else if (dbComm.collateralFor) {
               // Se o pai sumiu ou foi rejeitado, o colateral também some (libera)
               const parent = dbPromised.find(p => p.receivableId === dbComm.collateralFor);
               if (!parent || parent.status === 'rejected') {
                  await deletePromisedCommission(dbComm.receivableId);
               }
            }
          }
        }
        
        // Recarregar os dados do Firestore após a sincronização para refletir no UI
        const updatedDb = await fetchPromisedCommissions(firebaseUserId);
        setPromisedFromDb(updatedDb);
        
        // Limpar estados temporários de "sucesso" para forçar re-avaliação do botão
        // Se algo sumiu do Bitrix, ele deve voltar a ficar 'idle'
        setRequestStatus({});
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    syncAndLoad();
  }, [userInfo.nome, firebaseUserId]);

  // Filtro Global e por Aba
  const filteredReceivables = receivables.filter(item => {
    // 1. Filtro de Texto
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      item.nome.toLowerCase().includes(term) ||
      (item.cliente && item.cliente.toLowerCase().includes(term)) ||
      item.id.toLowerCase().includes(term) ||
      (item.empreendimento && item.empreendimento.toLowerCase().includes(term)) ||
      (item.blocoUnidade && item.blocoUnidade.toLowerCase().includes(term)) ||
      (item.construtora && item.construtora.toLowerCase().includes(term))
    );

    if (!matchesSearch) return false;

    // 2. Filtro de Aba
    if (activeTab === 'available') return isActuallyAvailable(item);
    if (activeTab === 'requested') return isActuallyRequested(item);
    if (activeTab === 'collateral') return isActuallyCollateral(item);
    
    return true;
  });

  // Agrupamento por ID baseado nos filtrados
  const grouped = filteredReceivables.reduce((acc, curr) => {
    if (!acc[curr.id]) {
      acc[curr.id] = {
        id: curr.id,
        items: [],
        totalAvailable: 0,
        totalPromised: 0,
        mainInfo: curr
      };
    }
    acc[curr.id].items.push(curr);
    
    const isRequested = isActuallyRequested(curr);
    const isCollateral = isActuallyCollateral(curr);

    if (isRequested || isCollateral) {
      acc[curr.id].totalPromised += curr.valorNumeric;
    } else {
      acc[curr.id].totalAvailable += curr.valorNumeric;
    }
    return acc;
  }, {} as Record<string, GroupedReceivable>);

  const groups = Object.values(grouped) as GroupedReceivable[];

  const totalAvailableAmount = receivables.filter(isActuallyAvailable).reduce((acc, curr) => acc + curr.valorNumeric, 0);
  const totalRequestedAmount = receivables.filter(isActuallyRequested).reduce((acc, curr) => acc + curr.valorNumeric, 0);
  const totalCollateralAmount = receivables.filter(isActuallyCollateral).reduce((acc, curr) => acc + curr.valorNumeric, 0);

  const handleRequestSingle = async (receivable: Receivable, uniqueId: string, collateral: Receivable[] = []) => {
    setRequestStatus(prev => ({ ...prev, [uniqueId]: 'loading' }));
    try {
      // Log de auditoria de solicitação
      logAccess(firebaseUserId, firebaseUserEmail, userInfo.nome, `SOLICITACAO_ANTECIPACAO: PV ${receivable.id}`);

      // 1. Bitrix
      await createBitrixDeal(receivable, userInfo, collateral);
      
      // 2. Firestore (Verdade absoluta interna)
      if (collateral.length > 0) {
        const { saveAdvancementWithCollateral: saveWithCollateral } = await import('../services/firebaseService');
        await saveWithCollateral(receivable, collateral, firebaseUserId);
      } else {
        await savePromisedCommission(receivable, firebaseUserId);
      }
      
      setRequestStatus(prev => ({ ...prev, [uniqueId]: 'success' }));
      setHasUsedCollateral(collateral.length > 0);
      setIsSuccessModalOpen(true);
      
      // Atualiza estados locais
      const [newDeals, newDbPromised] = await Promise.all([
        fetchExistingDeals([receivable.id, ...collateral.map(c => c.id)]),
        fetchPromisedCommissions(firebaseUserId)
      ]);
      setExistingDeals(prev => [...prev, ...newDeals]);
      setPromisedFromDb(newDbPromised);
    } catch (error) {
      setRequestStatus(prev => ({ ...prev, [uniqueId]: 'error' }));
      setTimeout(() => setRequestStatus(prev => ({ ...prev, [uniqueId]: 'idle' })), 3000);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse text-white/20">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold">Sincronizando Ativos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-white/5 border border-white/5 rounded-sm overflow-hidden">
        <div className="bg-[#111111] p-10 flex flex-col justify-between group hover:bg-white/[0.02] transition-colors relative">
          <div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Wallet size={12} /> Disponíveis
            </p>
            <h3 className="text-4xl md:text-5xl font-light mb-2">
              {receivables.filter(isActuallyAvailable).length}
            </h3>
          </div>
          <div className="mt-8 flex items-center gap-3 text-[10px] font-bold text-emerald-400 tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Pronto para Antecipação
          </div>
        </div>
        
        <div className="bg-[#111111] p-10 flex flex-col justify-between group hover:bg-white/[0.02] transition-colors">
          <div>
            <p className="text-[10px] font-bold text-amber-500/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Clock size={12} /> Solicitados
            </p>
            <h3 className="text-4xl md:text-5xl font-light mb-2 text-amber-500/80">
              {receivables.filter(isActuallyRequested).length}
            </h3>
          </div>
          <div className="mt-8 text-[10px] font-bold text-white/20 tracking-widest uppercase">
            Aguardando Liberação
          </div>
        </div>

        <div className="bg-[#111111] p-10 flex flex-col justify-between group hover:bg-white/[0.02] transition-colors">
          <div>
            <p className="text-[10px] font-bold text-blue-500/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Shield size={12} /> Em Garantia
            </p>
            <h3 className="text-4xl md:text-5xl font-light mb-2 text-blue-500/80">
              {receivables.filter(isActuallyCollateral).length}
            </h3>
          </div>
          <div className="mt-8 text-[10px] font-bold text-white/20 tracking-widest uppercase">
            Ativos Vinculados
          </div>
        </div>
      </div>

      {/* Menu de Abas */}
      <div className="flex border-b border-white/5 space-x-8 px-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'available', label: 'Títulos Disponíveis', icon: Wallet, count: receivables.filter(isActuallyAvailable).length, color: 'emerald' },
          { id: 'requested', label: 'Em Solicitação', icon: Clock, count: receivables.filter(isActuallyRequested).length, color: 'amber' },
          { id: 'collateral', label: 'Títulos em Garantia', icon: Shield, count: receivables.filter(isActuallyCollateral).length, color: 'blue' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-3 py-6 px-4 text-[10px] uppercase font-bold tracking-[0.2em] transition-all relative group shrink-0",
              activeTab === tab.id ? "text-white" : "text-white/20 hover:text-white/40"
            )}
          >
            <tab.icon size={14} className={cn(
              activeTab === tab.id ? 
              (tab.id === 'available' ? 'text-emerald-500' : tab.id === 'requested' ? 'text-amber-500' : 'text-blue-500') : 
              "text-white/10"
            )} />
            {tab.label}
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[8px] border",
              activeTab === tab.id ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10"
            )}>
              {tab.count}
            </span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5",
                  tab.id === 'available' ? 'bg-emerald-500' : tab.id === 'requested' ? 'bg-amber-500' : 'bg-blue-500'
                )} 
              />
            )}
          </button>
        ))}
      </div>

      {/* Lista de Recebíveis Agrupados */}
      <div className="space-y-8">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] uppercase tracking-[0.5em] font-bold text-white/40 flex items-center gap-2">
                <List size={14} /> Detalhamento por PV
              </h2>
              <div className="flex items-center gap-2">
                <NotificationCenter userId={firebaseUserId} />
                <button 
                  onClick={syncAndLoad} 
                  disabled={loading}
                  className="text-[9px] uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full"
                >
                  <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
                  Sincronizar Operações
                </button>
              </div>
            </div>
            <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter hidden md:block">Filtro: {userInfo.nome}</span>
          </div>

          {/* Barra de Busca */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-white/60 transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="BUSCAR POR CLIENTE, PV, EMPREENDIMENTO OU UNIDADE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 p-4 pl-12 rounded-sm text-[11px] font-bold tracking-[0.2em] text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all placeholder:text-white/10 uppercase"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-4 flex items-center text-[9px] font-bold text-white/20 hover:text-white/60 transition-colors uppercase tracking-widest"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-sm p-12 text-center">
            <p className="text-sm text-white/30 tracking-widest italic">Nenhum título pendente localizado para: {userInfo.nome}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group, gIdx) => (
              <motion.div 
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gIdx * 0.1 }}
                className="bg-[#111111] border border-white/5 rounded-sm overflow-hidden"
              >
                {/* Header do Grupo (PV) */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 flex items-center justify-center rounded-sm text-white/60">
                      <History size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-0.5">
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">ID PV: {group.id}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 rounded-sm uppercase tracking-tighter">
                          {group.mainInfo.construtora}
                        </span>
                        {group.mainInfo.userRole && group.mainInfo.userRole !== 'Corretor' && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 rounded-sm uppercase tracking-tighter flex items-center gap-1">
                            <Shield size={10} /> {group.mainInfo.userRole}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold uppercase tracking-wide truncate">{group.mainInfo.cliente || group.mainInfo.nome}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="text-right flex flex-col items-end border-r border-white/5 pr-8">
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Parcelas Ativas</p>
                      <p className="text-lg font-light">{group.items.length}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-[9px] font-bold text-amber-500/40 uppercase tracking-[0.2em] mb-1">Solicitadas</p>
                      <p className="text-lg font-light text-amber-500/70">
                        {group.items.filter(item => promisedFromDb.some(p => String(p.receivableId) === String(item.id) && p.status !== 'rejected')).length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de Parcelas dentro do Grupo */}
                <div className="divide-y divide-white/5">
                  {group.items.map((item, iIdx) => {
                    const isPago = item.status.toLowerCase().includes('pago');
                    const dbEntry = promisedFromDb.find(p => 
                      String(p.pvId) === String(item.id) && 
                      String(p.previsaoMes) === String(item.previsaoMes) && 
                      String(p.previsaoAno) === String(item.previsaoAno)
                    );
                    
                    const isRequested = dbEntry && dbEntry.status !== 'rejected';
                    const isAguardando = dbEntry?.stageName === 'Aguardando Solicitante';
                    const uniqueId = item.receivableId;
                    const status = requestStatus[uniqueId] || (isRequested ? 'already' : 'idle');

                    return (
                      <div 
                        key={uniqueId}
                        className={cn(
                          "px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors",
                          (isPago || isRequested) ? "bg-black/20" : "hover:bg-white/[0.01]",
                          (isPago || (isRequested && dbEntry?.status === 'approved')) && "opacity-30"
                        )}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn(
                            "w-1 h-8 rounded-full",
                            isPago ? "bg-white/10" : 
                            (isRequested && dbEntry?.status === 'approved') ? "bg-emerald-500/40" :
                            (isRequested && dbEntry?.status === 'pending') ? "bg-amber-500/40" :
                            (dbEntry?.status === 'rejected') ? "bg-rose-500/40" :
                            "bg-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                          )} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                                PARCELA {iIdx + 1}
                              </span>
                              {item.valorOriginalP && !isPago && (
                                <span className="text-[9px] text-white/30 italic">{item.valorOriginalP}</span>
                              )}
                              {isPago && (
                                <span className="text-[9px] font-bold uppercase text-emerald-500/60 tracking-wider flex items-center gap-1">
                                  ✓ Quitado
                                </span>
                              )}
                              {isRequested && !isPago && (
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider flex items-center gap-1",
                                  dbEntry?.status === 'approved' ? "text-emerald-500/60" : "text-amber-500/60"
                                )}>
                                  <Clock size={10} /> {dbEntry?.stageName || (dbEntry?.status === 'approved' ? 'Antecipação Realizada' : 'Antecipação em Processo')}
                                </span>
                              )}
                              {dbEntry?.status === 'rejected' && (
                                <span className="text-[9px] font-bold uppercase text-rose-500/60 tracking-wider flex items-center gap-1">
                                  <AlertCircle size={10} /> Antecipação Negada (Liberado)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-white/20 uppercase tracking-widest">
                               <span>Vencimento Estimado:</span>
                               <span className="text-white/40 font-bold">{item.previsaoMes}/{item.previsaoAno}</span>
                            </div>
                          </div>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 border-l border-white/5 pl-6">
                            <div>
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-0.5">Empreendimento</p>
                              <p className="text-[11px] text-white/80 uppercase font-medium truncate">{item.empreendimento || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-0.5">Unidade / Bloco</p>
                              <p className="text-[11px] text-white/80 uppercase font-medium">{item.blocoUnidade || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-0.5">Cliente</p>
                              <p className="text-[11px] text-white/80 uppercase font-medium truncate">{item.cliente || item.nome}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-12 shrink-0">
                          <AnimatePresence mode="wait">
                            {isAguardando ? (
                              <motion.button
                                key="proposal-btn"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => {
                                  // Log de auditoria de visualização de proposta
                                  logAccess(firebaseUserId, firebaseUserEmail, userInfo.nome, `VISUALIZACAO_PROPOSTA: PV ${dbEntry.pvId}`);

                                  // Encontra o deal correspondente no Bitrix para pegar os detalhes
                                  // Pegamos o deal mais recente (ID maior) para evitar pegar um deal rejeitado antigo
                                  const matchingDeals = existingDeals.filter(d => 
                                    String(d[BITRIX_FIELDS.PV]) === String(dbEntry.pvId) &&
                                    String(d.COMMENTS || '').includes(`${dbEntry.previsaoMes}/${dbEntry.previsaoAno}`)
                                  );
                                  const deal = matchingDeals.sort((a, b) => Number(b.ID) - Number(a.ID))[0];
                                  
                                  setActiveProposal({
                                    commissionId: dbEntry.receivableId,
                                    pvId: dbEntry.pvId,
                                    valorLiberado: deal ? Number(deal[BITRIX_FIELDS.VALOR_LIBERADO] || 0) : 0,
                                    observacoes: deal ? deal[BITRIX_FIELDS.OBSERVACOES] : '',
                                    dealId: deal?.ID,
                                    itemDetails: item
                                  });
                                  setIsProposalOpen(true);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 shadow-lg shadow-blue-500/20"
                              >
                                <FileSignature size={14} /> Ver Proposta
                              </motion.button>
                            ) : !isPago && (
                              <motion.button 
                                key={status}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => {
                                  if (status === 'idle') {
                                    setPendingRequest({ item, uniqueId });
                                    setIsCollateralModalOpen(true);
                                  }
                                }}
                                disabled={status !== 'idle'}
                                className={cn(
                                  "p-3 rounded-sm transition-all flex items-center justify-center min-w-[44px]",
                                  status === 'success' ? "bg-emerald-500/20 text-emerald-400" :
                                  status === 'error' ? "bg-rose-500/20 text-rose-400" :
                                  status === 'loading' ? "bg-white/5 text-white/20" :
                                  status === 'already' ? "bg-amber-500/10 text-amber-500/40 border border-amber-500/20" :
                                  "bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10"
                                )}
                              >
                                {status === 'loading' && <Loader2 size={16} className="animate-spin" />}
                                {status === 'success' && <CheckCircle2 size={16} />}
                                {status === 'error' && <AlertCircle size={16} />}
                                {status === 'already' && <Clock size={16} />}
                                {status === 'idle' && <ArrowRight size={16} />}
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <ProposalModal 
        isOpen={isProposalOpen}
        onClose={() => setIsProposalOpen(false)}
        proposal={activeProposal}
        userInfo={userInfo}
        onSuccess={syncAndLoad}
      />
      {pendingRequest && (
        <CollateralModal
          isOpen={isCollateralModalOpen}
          onClose={() => {
            setIsCollateralModalOpen(false);
            setPendingRequest(null);
          }}
          primaryReceivable={pendingRequest.item}
          availableReceivables={receivables.filter(isActuallyAvailable)}
          onConfirm={(collateral) => {
            handleRequestSingle(pendingRequest.item, pendingRequest.uniqueId, collateral);
          }}
        />
      )}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        hasCollateral={hasUsedCollateral}
      />
    </div>
  );
}
