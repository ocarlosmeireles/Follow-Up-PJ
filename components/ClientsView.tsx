import React, { useState, useMemo, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { MagnifyingGlassIcon, UserPlusIcon, UserGroupIcon, CurrencyDollarIcon, SparklesIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon } from './icons';

interface ClientsViewProps {
  clients: Client[];
  contacts: Contact[];
  budgets: Budget[];
  onSelectClient: (clientId: string) => void;
  onAddClientClick: () => void;
}

type ExtendedClient = Client & {
    budgetCount: number;
    contactCount: number;
    totalValue: number;
    lastActivityDate: Date | null;
    activityStatus: 'active' | 'inactive' | 'idle';
    daysSinceActivity: number | null;
    wonBudgets: Budget[];
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const KPICard = ({ title, value, icon, className = '' }: { title: string, value: string | number, icon: React.ReactNode, className?: string }) => (
    <div className={`bg-white dark:bg-slate-800 p-4 rounded-lg flex items-center gap-4 border border-gray-200 dark:border-slate-700 shadow-sm ${className}`}>
        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const ClientCard: React.FC<{ client: ExtendedClient, onSelectClient: (id: string) => void, onGenerateIdea: (client: ExtendedClient) => void }> = ({ client, onSelectClient, onGenerateIdea }) => {
    const ActivityBadge = () => {
        switch (client.activityStatus) {
            case 'active':
                return <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500"></span>Ativo</div>;
            case 'inactive':
                 return <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-600 dark:text-yellow-400"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>Inativo</div>;
            default:
                 return <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-400"></span>Ocioso</div>;
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col p-4 transition-all duration-200 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600">
            <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-slate-100">{client.name}</h3>
                    <ActivityBadge />
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">{client.cnpj || 'Sem CNPJ'}</p>
                
                <div className="grid grid-cols-3 gap-2 text-center my-4 py-2 border-y border-gray-100 dark:border-slate-700">
                    <div>
                        <p className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(client.totalValue)}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Ganhos</p>
                    </div>
                    <div>
                        <p className="font-bold text-gray-700 dark:text-slate-200">{client.budgetCount}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Orçamentos</p>
                    </div>
                     <div>
                        <p className="font-bold text-gray-700 dark:text-slate-200">{client.contactCount}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Contatos</p>
                    </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                    Última atividade: {client.lastActivityDate ? client.lastActivityDate.toLocaleDateString('pt-BR') : 'Nenhuma'}
                </p>
            </div>
            <div className="mt-4 flex gap-2">
                <button onClick={() => onSelectClient(client.id)} className="w-full text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-semibold py-2 px-3 rounded-md transition-colors">
                    Ver Detalhes
                </button>
                {client.activityStatus === 'inactive' && (
                    <button onClick={() => onGenerateIdea(client)} title="Gerar ideia para reengajar" className="flex-shrink-0 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-600 dark:text-purple-400 font-semibold py-2 px-3 rounded-md transition-colors">
                        <SparklesIcon className="w-5 h-5"/>
                    </button>
                )}
            </div>
        </div>
    );
};

const ClientsView: React.FC<ClientsViewProps> = ({ clients, contacts, budgets, onSelectClient, onAddClientClick }) => {
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [aiIdea, setAiIdea] = useState<{ client: ExtendedClient | null, idea: string, loading: boolean, error: string | null }>({ client: null, idea: '', loading: false, error: null });

    const clientData = useMemo<ExtendedClient[]>(() => {
        const INACTIVE_THRESHOLD_DAYS = 90;
        const now = new Date();

        return clients.map(client => {
            const clientBudgets = budgets.filter(b => b.clientId === client.id);
            const clientContacts = contacts.filter(c => c.clientId === client.id);
            
            let lastActivityDate: Date | null = null;
            if (clientBudgets.length > 0) {
                const dates = clientBudgets.flatMap(b => [new Date(b.dateSent), ...b.followUps.map(f => new Date(f.date))]).filter(d => !isNaN(d.getTime()));
                if(dates.length > 0) {
                     lastActivityDate = new Date(Math.max(...dates.map(d => d.getTime())));
                }
            }
            
            let activityStatus: 'active' | 'inactive' | 'idle' = 'idle';
            let daysSinceActivity: number | null = null;

            if (lastActivityDate) {
                const diffTime = Math.abs(now.getTime() - lastActivityDate.getTime());
                daysSinceActivity = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                activityStatus = daysSinceActivity > INACTIVE_THRESHOLD_DAYS ? 'inactive' : 'active';
            }
            
            const wonBudgets = clientBudgets.filter(b => b.status === BudgetStatus.WON);
            const totalValue = wonBudgets.reduce((sum, b) => sum + b.value, 0);

            return {
                ...client,
                budgetCount: clientBudgets.length,
                contactCount: clientContacts.length,
                totalValue,
                lastActivityDate,
                activityStatus,
                daysSinceActivity,
                wonBudgets,
            };
        });
    }, [clients, contacts, budgets]);

    const kpis = useMemo(() => {
        const activeClients = clientData.filter(c => c.activityStatus === 'active').length;
        const inactiveClients = clientData.filter(c => c.activityStatus === 'inactive').length;
        const totalRevenue = clientData.reduce((sum, c) => sum + c.totalValue, 0);
        return {
            totalClients: clients.length,
            activeClients,
            inactiveClients,
            totalRevenue,
        };
    }, [clientData, clients.length]);
    
    const filteredClients = useMemo(() => {
        return clientData
            .filter(client => {
                const statusMatch = filter === 'all' || client.activityStatus === filter;
                const searchMatch = searchTerm === '' ||
                    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (client.cnpj && client.cnpj.replace(/\D/g,'').includes(searchTerm.replace(/\D/g,'')));
                return statusMatch && searchMatch;
            })
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [clientData, searchTerm, filter]);

     const handleGenerateIdea = useCallback(async (client: ExtendedClient) => {
        setAiIdea({ client, idea: '', loading: true, error: null });
        try {
             if (!process.env.API_KEY) throw new Error('A chave da API não está configurada.');
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

             const prompt = `Gere uma ideia para reengajar um cliente inativo.
Nome do Cliente: ${client.name}
Inativo há: ${client.daysSinceActivity} dias.
Histórico de projetos ganhos: ${client.wonBudgets.map(b => b.title).join(', ') || 'Nenhum'}

A ideia deve ser curta, amigável e profissional, com o objetivo de iniciar uma nova conversa.
Sugira o texto para um e-mail ou uma mensagem de WhatsApp.
Formate a resposta em markdown simples. Forneça apenas o texto da mensagem, sem introduções ou despedidas genéricas como "[Seu Nome]".`;

             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: prompt,
                 config: { systemInstruction: "Você é um assistente de vendas especialista em reengajamento de clientes (CRM). Suas sugestões são proativas e focadas em criar valor." }
             });

             setAiIdea({ client, idea: response.text, loading: false, error: null });
        } catch(error) {
            console.error("Erro ao gerar ideia com IA:", error);
            setAiIdea({ client, idea: '', loading: false, error: 'Falha ao gerar sugestão. Tente novamente.' });
        }
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Hub de Clientes</h1>
                    <p className="text-gray-500 dark:text-gray-400">Sua central de inteligência sobre a carteira de clientes.</p>
                </div>
                <button onClick={onAddClientClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm self-start md:self-center">
                    <UserPlusIcon className="w-5 h-5 mr-2" />
                    Novo Cliente
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Total de Clientes" value={kpis.totalClients} icon={<UserGroupIcon className="w-6 h-6 text-blue-500 dark:text-blue-400"/>} />
                <KPICard title="Clientes Ativos" value={kpis.activeClients} icon={<ArrowTrendingUpIcon className="w-6 h-6 text-green-500 dark:text-green-400"/>} />
                <KPICard title="Clientes Inativos" value={kpis.inactiveClients} icon={<ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400"/>} />
                <KPICard title="Receita Total" value={formatCurrency(kpis.totalRevenue)} icon={<CurrencyDollarIcon className="w-6 h-6 text-purple-500 dark:text-purple-400"/>} />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${filter === 'all' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>Todos</button>
                        <button onClick={() => setFilter('active')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${filter === 'active' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>Ativos</button>
                        <button onClick={() => setFilter('inactive')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${filter === 'inactive' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>Inativos</button>
                    </div>
                     <div className="relative w-full sm:w-72">
                         <span className="absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="w-5 h-5 text-gray-400" /></span>
                        <input type="text" placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg py-2 pl-10 focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                </div>

                 {aiIdea.client && (
                    <div className="mb-4 bg-purple-50 border border-purple-200 dark:bg-purple-900/40 dark:border-purple-800/50 p-4 rounded-lg">
                        <h4 className="font-bold text-purple-800 dark:text-purple-200">Sugestão para {aiIdea.client.name}:</h4>
                        {aiIdea.loading && <p className="text-sm text-purple-700 dark:text-purple-300 animate-pulse">Gerando ideia...</p>}
                        {aiIdea.error && <p className="text-sm text-red-600 dark:text-red-400">{aiIdea.error}</p>}
                        {aiIdea.idea && <div className="prose prose-sm dark:prose-invert text-gray-800 dark:text-slate-200 mt-2 whitespace-pre-wrap">{aiIdea.idea}</div>}
                    </div>
                 )}

                {filteredClients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredClients.map(client => (
                            <ClientCard key={client.id} client={client} onSelectClient={onSelectClient} onGenerateIdea={handleGenerateIdea} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400 dark:text-slate-500">
                        <p className="font-semibold text-gray-600 dark:text-slate-300">Nenhum cliente encontrado.</p>
                        <p>Tente ajustar a busca ou os filtros.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientsView;