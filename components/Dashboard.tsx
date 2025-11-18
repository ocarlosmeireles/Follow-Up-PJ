import React, { useState, useMemo } from 'react';
import type { Budget, Client, ThemeVariant, UserProfile, UserData } from '../types';
import { BudgetStatus } from '../types';
import { CurrencyDollarIcon, TrophyIcon, ChartPieIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, CalendarIcon, CheckCircleIcon } from './icons';
import InfoBar from './InfoBar';
import Leaderboard from './Leaderboard';

interface DashboardProps {
  budgets: Budget[];
  clients: Client[];
  users: UserData[];
  onSelectBudget: (id: string) => void;
  themeVariant: ThemeVariant;
  userProfile: UserProfile;
  onOpenReportDetail: (title: string, budgets: Budget[]) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatFollowUpDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';
        const hasTime = dateString.includes('T');
        if (hasTime) {
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
            }).replace(',', ' às');
        } else {
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));
            return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        }
    } catch (e) {
        return 'Data inválida';
    }
};

// Componente de cartão de métrica para temas clássicos
const ClassicMetricCard = ({ title, value, icon, style, className }: { title: string, value: string | number, icon: React.ReactNode, style?: React.CSSProperties, className?: string }) => (
    <div style={style} className={`bg-[var(--background-secondary)] p-6 rounded-xl flex items-center gap-4 border border-[var(--border-primary)] shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className || ''}`}>
        <div className="bg-[var(--background-tertiary)] p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

// Componente de cartão de métrica para o novo tema 'dashboard'
const DashboardMetricCard = ({ title, value, subValue, icon, gradient, style, className }: { title: string, value: string | number, subValue: string, icon: React.ReactNode, gradient: string, style?: React.CSSProperties, className?: string }) => (
    <div style={style} className={`relative p-6 rounded-2xl text-white overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${gradient} ${className || ''}`}>
        <div className="relative z-10">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-lg font-semibold">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                    {icon}
                </div>
            </div>
            <p className="text-sm opacity-80 mt-4">{subValue}</p>
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
         <div className="absolute -bottom-10 -left-2 w-20 h-20 bg-white/10 rounded-full"></div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ budgets, clients, users, onSelectBudget, themeVariant, userProfile, onOpenReportDetail }) => {
    const [timePeriod, setTimePeriod] = useState<'month' | '30days' | 'all'>('all');

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const filteredBudgetsByTime = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        return budgets.filter(b => {
            if (timePeriod === 'all') return true;
            const budgetDate = new Date(b.dateSent);
            if (timePeriod === 'month') return budgetDate >= firstDayOfMonth;
            if (timePeriod === '30days') return budgetDate >= thirtyDaysAgo;
            return true;
        });
    }, [budgets, timePeriod]);

    const metrics = useMemo(() => {
        const activeBudgets = filteredBudgetsByTime.filter(b => [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED].includes(b.status));
        const invoicedBudgets = filteredBudgetsByTime.filter(b => b.status === BudgetStatus.INVOICED);
        const lostBudgets = filteredBudgetsByTime.filter(b => b.status === BudgetStatus.LOST);

        const totalActiveValue = activeBudgets.reduce((sum, b) => sum + b.value, 0);
        const totalInvoicedValue = invoicedBudgets.reduce((sum, b) => sum + b.value, 0);

        const totalWon = invoicedBudgets.length;
        const totalLost = lostBudgets.length;
        const totalDecided = totalWon + totalLost;
        const closingRate = totalDecided > 0 ? (totalWon / totalDecided * 100).toFixed(1) + '%' : 'N/A';
        const pipelineConversion = budgets.length > 0 ? (totalWon / budgets.length * 100).toFixed(1) + '%' : 'N/A';
        
        const forecastValue = totalActiveValue * (totalDecided > 0 ? totalWon / totalDecided : 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueBudgets = budgets.filter(b => { // Overdue is independent of time filter
            if (!b.nextFollowUpDate || ![BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(b.status)) return false;
            const followUpDate = new Date(b.nextFollowUpDate);
            const followUpDateOnly = new Date(followUpDate.getFullYear(), followUpDate.getMonth(), followUpDate.getDate());
            return followUpDateOnly < today;
        });
        const overdueCount = overdueBudgets.length;

        return { 
            totalActiveValue, 
            totalWonValue: totalInvoicedValue, 
            closingRate, 
            pipelineConversion, 
            overdueCount, 
            forecastValue, 
            totalActiveCount: activeBudgets.length,
            activeBudgets,
            invoicedBudgets,
            overdueBudgets,
        };
    }, [filteredBudgetsByTime, budgets]);
    
    const { monthlyAchieved, monthlyGoal, goalProgress } = useMemo(() => {
        const goal = userProfile.monthlyGoal || 0;
        if (goal === 0) {
            return { monthlyAchieved: 0, monthlyGoal: 0, goalProgress: 0 };
        }
    
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
    
        const achieved = budgets
            .filter(b => 
                b.userId === (userProfile as UserData).id && 
                b.status === BudgetStatus.INVOICED &&
                new Date(b.dateSent).getMonth() === currentMonth &&
                new Date(b.dateSent).getFullYear() === currentYear
            )
            .reduce((sum, b) => sum + b.value, 0);
    
        const progress = goal > 0 ? (achieved / goal) * 100 : 0;
        
        return { monthlyAchieved: achieved, monthlyGoal: goal, goalProgress: progress };
    }, [budgets, userProfile]);

    const nextTasks = useMemo(() => {
         const activeBudgetsWithFollowUp = budgets.filter(b =>
            (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate
        );
        return activeBudgetsWithFollowUp
            .sort((a,b) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime())
            .slice(0, 5);
    }, [budgets]);
    
    const useModernCards = themeVariant === 'dashboard' || themeVariant === 'aurora';

    const timePeriodLabel = timePeriod === 'all' ? 'Todo o período' : timePeriod === 'month' ? 'Este mês' : 'Últimos 30 dias';

    return (
        <div className="space-y-8">
            <InfoBar />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                    <h2 className="text-xl font-medium text-[var(--text-secondary)]">Olá, {userProfile.name}!</h2>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mt-1">Dashboard de Vendas</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Bem-vindo(a) de volta! Este é o seu painel de controle.</p>
                </div>
                <div className="flex items-center gap-1 bg-[var(--background-tertiary)] p-1 rounded-lg mt-4 md:mt-0 self-start md:self-center">
                    <button onClick={() => setTimePeriod('month')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === 'month' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Este Mês</button>
                    <button onClick={() => setTimePeriod('30days')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === '30days' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Últimos 30 dias</button>
                    <button onClick={() => setTimePeriod('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === 'all' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Todo o Período</button>
                </div>
            </div>
            
            {useModernCards ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
                    <div onClick={() => onOpenReportDetail(`Pipeline Ativo (${timePeriodLabel})`, metrics.activeBudgets)} className="cursor-pointer animated-item" style={{ animationDelay: '100ms' }}>
                        <DashboardMetricCard title="Pipeline Ativo" value={`R$ ${formatCurrency(metrics.totalActiveValue)}`} subValue={`${metrics.totalActiveCount} negócios`} icon={<CurrencyDollarIcon className="w-8 h-8"/>} gradient="bg-gradient-to-br from-blue-500 to-blue-700"/>
                    </div>
                    <div onClick={() => onOpenReportDetail(`Total Faturado (${timePeriodLabel})`, metrics.invoicedBudgets)} className="cursor-pointer animated-item" style={{ animationDelay: '200ms' }}>
                        <DashboardMetricCard title="Total Faturado" value={`R$ ${formatCurrency(metrics.totalWonValue)}`} subValue="no período" icon={<TrophyIcon className="w-8 h-8"/>} gradient={themeVariant === 'aurora' ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-purple-500 to-purple-700'}/>
                    </div>
                    <DashboardMetricCard style={{ animationDelay: '300ms' }} className="animated-item" title="Taxa de Fechamento" value={metrics.closingRate} subValue="de negócios decididos" icon={<ChartPieIcon className="w-8 h-8"/>} gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"/>
                    <DashboardMetricCard style={{ animationDelay: '400ms' }} className="animated-item" title="Conversão Pipeline" value={metrics.pipelineConversion} subValue="do total de orçamentos" icon={<ArrowTrendingUpIcon className="w-8 h-8"/>} gradient="bg-gradient-to-br from-cyan-500 to-cyan-700"/>
                    <div onClick={() => onOpenReportDetail('Follow-ups Atrasados', metrics.overdueBudgets)} className="cursor-pointer animated-item" style={{ animationDelay: '500ms' }}>
                        <DashboardMetricCard title="Atrasados" value={metrics.overdueCount} subValue="follow-ups pendentes" icon={<ExclamationTriangleIcon className="w-8 h-8"/>} gradient={themeVariant === 'aurora' ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-teal-500 to-teal-700'}/>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                    <div onClick={() => onOpenReportDetail(`Pipeline Ativo (${timePeriodLabel})`, metrics.activeBudgets)} className="cursor-pointer animated-item" style={{ animationDelay: '100ms' }}>
                        <ClassicMetricCard title="Pipeline Ativo" value={formatCurrency(metrics.totalActiveValue)} icon={<CurrencyDollarIcon className="w-6 h-6 text-blue-500" />} />
                    </div>
                    <ClassicMetricCard style={{ animationDelay: '200ms' }} className="animated-item" title="Previsão de Vendas" value={formatCurrency(metrics.forecastValue)} icon={<ArrowTrendingUpIcon className="w-6 h-6 text-purple-500" />} />
                    <div onClick={() => onOpenReportDetail(`Total Faturado (${timePeriodLabel})`, metrics.invoicedBudgets)} className="cursor-pointer animated-item" style={{ animationDelay: '300ms' }}>
                        <ClassicMetricCard title="Total Faturado" value={formatCurrency(metrics.totalWonValue)} icon={<TrophyIcon className="w-6 h-6 text-green-500" />} />
                    </div>
                    <ClassicMetricCard style={{ animationDelay: '400ms' }} className="animated-item" title="Taxa de Fechamento" value={metrics.closingRate} icon={<ChartPieIcon className="w-6 h-6 text-yellow-500" />} />
                    <div onClick={() => onOpenReportDetail('Follow-ups Atrasados', metrics.overdueBudgets)} className="cursor-pointer animated-item" style={{ animationDelay: '500ms' }}>
                        <ClassicMetricCard title="Follow-ups Atrasados" value={metrics.overdueCount} icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-500" />} />
                    </div>
                </div>
            )}
            
            {monthlyGoal > 0 && (
                <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm animated-item" style={{ animationDelay: '500ms' }}>
                    <h3 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-4">Sua Meta Mensal</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-end font-semibold">
                            <span className="text-3xl font-bold text-[var(--text-accent)]">{formatCurrency(monthlyAchieved)}</span>
                            <span className="text-lg text-[var(--text-secondary)]">de {formatCurrency(monthlyGoal)}</span>
                        </div>
                        <div className="w-full bg-[var(--background-tertiary)] rounded-full h-4 overflow-hidden">
                            <div 
                                className="bg-[var(--accent-primary)] h-4 rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${Math.min(goalProgress, 100)}%` }}
                            ></div>
                        </div>
                        <div className="text-right text-sm font-bold text-[var(--text-primary)]">
                            {goalProgress.toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm animated-item" style={{ animationDelay: '600ms' }}>
                     <h3 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-4">Próximas Tarefas</h3>
                     {nextTasks.length > 0 ? (
                        <div className="space-y-4">
                            {nextTasks.map((budget, index) => {
                                 const today = new Date();
                                 today.setHours(0,0,0,0);
                                 const followUpDate = new Date(budget.nextFollowUpDate!);
                                 const isOverdue = followUpDate < today;
                                 return (
                                    <div 
                                        key={budget.id}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        onClick={() => onSelectBudget(budget.id)}
                                        className="animated-item bg-[var(--background-secondary-hover)] p-4 rounded-lg cursor-pointer hover:bg-[var(--background-tertiary)] border border-[var(--border-secondary)] shadow-sm transition-all duration-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center"
                                    >
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)] truncate">{budget.title}</p>
                                            <p className="text-sm text-[var(--text-accent)]">{clientMap.get(budget.clientId)}</p>
                                        </div>
                                        <p className="text-lg font-semibold text-[var(--text-secondary)] text-left sm:text-right">{formatCurrency(budget.value)}</p>
                                        <div className={`flex items-center gap-2 font-semibold ${isOverdue ? 'text-red-500' : 'text-yellow-600'}`}>
                                            <CalendarIcon className="w-5 h-5"/>
                                            <span>{formatFollowUpDate(budget.nextFollowUpDate)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                     ) : (
                        <div className="text-center py-10 bg-[var(--background-secondary-hover)] rounded-lg text-[var(--text-secondary)] border border-dashed border-[var(--border-secondary)]">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-[var(--text-tertiary)]"/>
                            <p className="font-semibold text-[var(--text-primary)]">Nenhuma tarefa futura agendada.</p>
                            <p className="text-sm">Agende um follow-up em um orçamento para vê-lo aqui.</p>
                        </div>
                     )}
                </div>
                 <div className="lg:col-span-2 animated-item" style={{ animationDelay: '700ms' }}>
                    <Leaderboard users={users} budgets={budgets} currentUser={userProfile as UserData} />
                </div>
            </div>

        </div>
    );
};

export default Dashboard;