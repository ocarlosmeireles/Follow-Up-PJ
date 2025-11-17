import React, { useMemo } from 'react';
import type { Budget, Client, UserProfile } from '../types';
import { BudgetStatus } from '../types';
import { TrophyIcon, ChartPieIcon, CurrencyDollarIcon, ChartBarIcon, FunnelIcon, UserGroupIcon, ClipboardDocumentListIcon, CalendarIcon, ExclamationTriangleIcon } from './icons';

interface ReportsViewProps {
  budgets: Budget[];
  clients: Client[];
  userProfile: UserProfile;
  onGenerateDailyReport: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const MetricCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg flex items-center gap-5 border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="bg-blue-50 dark:bg-slate-700 p-4 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-base text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const ReportsView: React.FC<ReportsViewProps> = ({ budgets, clients, userProfile, onGenerateDailyReport }) => {
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
    
    const metrics = useMemo(() => {
        const invoicedBudgets = budgets.filter(b => b.status === BudgetStatus.INVOICED);
        const lostBudgets = budgets.filter(b => b.status === BudgetStatus.LOST);

        const totalInvoicedValue = invoicedBudgets.reduce((sum, b) => sum + b.value, 0);
        const totalClosed = invoicedBudgets.length + lostBudgets.length;
        
        const conversionRate = totalClosed > 0 
            ? ((invoicedBudgets.length / totalClosed) * 100).toFixed(1) + '%' 
            : 'N/A';
        
        const averageTicket = invoicedBudgets.length > 0 
            ? totalInvoicedValue / invoicedBudgets.length 
            : 0;
            
        return { totalWonValue: totalInvoicedValue, conversionRate, averageTicket };
    }, [budgets]);

    const monthlyPerformance = useMemo(() => {
        const performance: { [key: string]: number } = {};
        const invoicedBudgets = budgets.filter(b => b.status === BudgetStatus.INVOICED);
        
        invoicedBudgets.forEach(b => {
            const date = new Date(b.dateSent);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!performance[monthKey]) {
                performance[monthKey] = 0;
            }
            performance[monthKey] += b.value;
        });

        const sortedMonths = Object.keys(performance).sort();
        const last12Months = sortedMonths.slice(-12);
        
        const data = last12Months.map(monthKey => {
             const [year, month] = monthKey.split('-');
             const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            return {
                label,
                value: performance[monthKey],
            };
        });

        const maxValue = Math.max(...data.map(d => d.value), 0);

        return { data, maxValue };

    }, [budgets]);
    
    const salesFunnelData = useMemo(() => {
        const sent = budgets;
        const followingUp = budgets.filter(b => [BudgetStatus.FOLLOWING_UP, BudgetStatus.ON_HOLD, BudgetStatus.ORDER_PLACED, BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));
        const orderPlaced = budgets.filter(b => [BudgetStatus.ORDER_PLACED, BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));
        const invoiced = budgets.filter(b => b.status === BudgetStatus.INVOICED);

        const stages = [
            { name: 'Enviado', count: sent.length, value: sent.reduce((sum, b) => sum + b.value, 0) },
            { name: 'Em Follow-up', count: followingUp.length, value: followingUp.reduce((sum, b) => sum + b.value, 0) },
            { name: 'Pedido Emitido', count: orderPlaced.length, value: orderPlaced.reduce((sum, b) => sum + b.value, 0) },
            { name: 'Faturados', count: invoiced.length, value: invoiced.reduce((sum, b) => sum + b.value, 0) }
        ];
        
        const maxCount = Math.max(...stages.map(s => s.count), 1);

        return stages.map((stage, index) => {
            const prevStage = stages[index - 1];
            const conversionRate = prevStage && prevStage.count > 0 ? (stage.count / prevStage.count) * 100 : 100;
            const widthPercentage = (stage.count / maxCount) * 100;
            return { ...stage, conversionRate, widthPercentage };
        });
    }, [budgets]);

    const topClients = useMemo(() => {
        const valueByClient: { [clientId: string]: number } = {};
        budgets.forEach(b => {
            if (b.status === BudgetStatus.INVOICED) {
                if (!valueByClient[b.clientId]) {
                    valueByClient[b.clientId] = 0;
                }
                valueByClient[b.clientId] += b.value;
            }
        });

        return Object.entries(valueByClient)
            .sort(([, aValue], [, bValue]) => bValue - aValue)
            .slice(0, 5)
            .map(([clientId, totalValue]) => ({
                name: clientMap.get(clientId) || 'Cliente desconhecido',
                value: totalValue
            }));
    }, [budgets, clientMap]);

    const lostReasonAnalysis = useMemo(() => {
        const lostBudgets = budgets.filter(b => b.status === BudgetStatus.LOST && b.lostReason);
        if (lostBudgets.length === 0) {
            return { data: [], maxValue: 0, totalLost: 0 };
        }

        // FIX: Use type assertion on the initial value of `reduce` to properly type the accumulator as `Record<string, number>`.
        // This resolves subsequent type errors where arithmetic operations were attempted on values inferred as `unknown`.
        const reasonCounts = lostBudgets.reduce((acc, budget) => {
            const reason = budget.lostReason!;
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const data = Object.entries(reasonCounts)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);
        
        const maxValue = Math.max(...data.map(d => d.count), 0);

        return { data, maxValue, totalLost: lostBudgets.length };
    }, [budgets]);

    const handleExport = () => {
        const date = new Date().toLocaleString('pt-BR');

        const reportHtml = `
            <html>
            <head>
                <title>Relatório de Vendas</title>
                <style>
                    body { font-family: sans-serif; margin: 2rem; }
                    h1, h2, h3 { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { margin-bottom: 2rem; border-bottom: 2px solid #ccc; padding-bottom: 1rem; }
                    .kpi-container { display: flex; justify-content: space-around; text-align: center; margin-bottom: 2rem; }
                    .kpi-card { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; flex-grow: 1; margin: 0 0.5rem; }
                    .kpi-card p { margin: 0; }
                    .kpi-title { color: #666; font-size: 0.9rem; }
                    .kpi-value { font-size: 1.5rem; font-weight: bold; }
                    .section { margin-bottom: 2rem; }
                    @media print {
                        body { margin: 1rem; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório de Vendas</h1>
                    <p>Exportado por: <strong>${userProfile.name}</strong> (Matrícula: ${userProfile.matricula})</p>
                    <p>E-mail: ${userProfile.email}</p>
                    <p>Data: ${date}</p>
                </div>

                <div class="section kpi-container">
                    <div class="kpi-card">
                        <p class="kpi-title">Faturamento Total</p>
                        <p class="kpi-value">${formatCurrency(metrics.totalWonValue)}</p>
                    </div>
                    <div class="kpi-card">
                        <p class="kpi-title">Taxa de Conversão</p>
                        <p class="kpi-value">${metrics.conversionRate}</p>
                    </div>
                    <div class="kpi-card">
                        <p class="kpi-title">Ticket Médio</p>
                        <p class="kpi-value">${formatCurrency(metrics.averageTicket)}</p>
                    </div>
                </div>
                
                <div class="section">
                    <h3>Top 5 Clientes por Faturamento</h3>
                    ${topClients.length > 0 ? `
                    <table>
                        <thead><tr><th>Cliente</th><th>Total Faturado</th></tr></thead>
                        <tbody>
                            ${topClients.map(c => `<tr><td>${c.name}</td><td>${formatCurrency(c.value)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    ` : '<p>Nenhum cliente com negócios faturados para exibir.</p>'}
                </div>

                <div class="section">
                    <h3>Funil de Vendas</h3>
                    <table>
                        <thead><tr><th>Etapa</th><th>Orçamentos (Qtd)</th><th>Valor</th></tr></thead>
                        <tbody>
                            ${salesFunnelData.map(s => `<tr><td>${s.name}</td><td>${s.count}</td><td>${formatCurrency(s.value)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h3>Performance Mensal (Últimos 12 meses)</h3>
                     ${monthlyPerformance.data.length > 0 ? `
                    <table>
                        <thead><tr><th>Mês</th><th>Faturamento</th></tr></thead>
                        <tbody>
                            ${monthlyPerformance.data.map(m => `<tr><td>${m.label}</td><td>${formatCurrency(m.value)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    ` : '<p>Nenhum dado de performance para exibir.</p>'}
                </div>

            </body>
            </html>
        `;

        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(reportHtml);
            reportWindow.document.close();
            reportWindow.print();
        } else {
            alert('Por favor, habilite pop-ups para exportar o relatório.');
        }
    };


    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Relatórios</h1>
                    <p className="text-gray-500 dark:text-gray-400">Analise a performance de suas vendas.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600 flex items-center transition-colors duration-200 shadow-sm"
                >
                    <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
                    Exportar Relatório Geral
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '100ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4">Relatórios Rápidos</h2>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={onGenerateDailyReport}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600 flex items-center transition-colors duration-200"
                    >
                        <CalendarIcon className="w-5 h-5 mr-2" />
                        Relatório de Follow-ups do Dia
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="animated-item" style={{ animationDelay: '200ms' }}><MetricCard title="Faturamento Total" value={formatCurrency(metrics.totalWonValue)} icon={<TrophyIcon className="w-7 h-7 text-green-500 dark:text-green-400" />} /></div>
                <div className="animated-item" style={{ animationDelay: '300ms' }}><MetricCard title="Taxa de Conversão" value={metrics.conversionRate} icon={<ChartPieIcon className="w-7 h-7 text-yellow-500 dark:text-yellow-400" />} /></div>
                <div className="animated-item" style={{ animationDelay: '400ms' }}><MetricCard title="Ticket Médio" value={formatCurrency(metrics.averageTicket)} icon={<CurrencyDollarIcon className="w-7 h-7 text-blue-500 dark:text-blue-400" />} /></div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '500ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                    <ChartBarIcon className="w-6 h-6 mr-3 text-purple-500 dark:text-purple-400"/>
                    Performance Mensal (Últimos 12 meses)
                </h2>
                {monthlyPerformance.data.length > 0 ? (
                    <div className="w-full overflow-x-auto pb-4">
                        <div className="h-80 flex items-end justify-start gap-4 pt-4 border-t border-gray-200 dark:border-slate-700 min-w-[600px]">
                            {monthlyPerformance.data.map(({ label, value }) => (
                                <div key={label} className="flex flex-col items-center h-full flex-1" title={`${label}: ${formatCurrency(value)}`}>
                                    <div className="w-full h-full flex items-end">
                                        <div 
                                            className="w-full bg-purple-500 hover:bg-purple-400 dark:bg-purple-600 dark:hover:bg-purple-500 rounded-t-md transition-all duration-300"
                                            style={{ height: `${monthlyPerformance.maxValue > 0 ? (value / monthlyPerformance.maxValue) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-semibold capitalize">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400 dark:text-slate-500 border-t border-gray-200 dark:border-slate-700">
                        <p>Nenhum dado de performance para exibir.</p>
                        <p>Conclua um orçamento como "Faturado" para começar a gerar dados.</p>
                    </div>
                )}
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '600ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                    <FunnelIcon className="w-6 h-6 mr-3 text-blue-500 dark:text-blue-400"/>
                    Funil de Vendas
                </h2>
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                    {salesFunnelData.map((stage, index) => (
                        <div key={stage.name}>
                            {index > 0 && (
                                <div className="text-center my-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto text-gray-400 dark:text-slate-500">
                                        <path d="M12 5V19M12 19L7 14M12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">{stage.conversionRate.toFixed(1)}%</span>
                                </div>
                            )}
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                                    <span className="text-gray-800 dark:text-slate-200">{stage.name}</span>
                                    <div className="text-right">
                                        <span className="text-blue-600 dark:text-blue-400">{formatCurrency(stage.value)}</span>
                                        <span className="text-gray-500 dark:text-gray-400 ml-2">({stage.count})</span>
                                    </div>
                                </div>
                                <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-3">
                                    <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${stage.widthPercentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '700ms' }}>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                        <ExclamationTriangleIcon className="w-6 h-6 mr-3 text-red-500 dark:text-red-400"/>
                        Análise de Perdas ({lostReasonAnalysis.totalLost} negócios)
                    </h2>
                    {lostReasonAnalysis.data.length > 0 ? (
                        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                            {lostReasonAnalysis.data.map(item => {
                                const percentage = lostReasonAnalysis.maxValue > 0 ? (item.count / lostReasonAnalysis.maxValue) * 100 : 0;
                                return (
                                    <div key={item.reason} className="flex items-center gap-3 text-sm">
                                        <span className="w-40 text-gray-600 dark:text-slate-400 truncate font-medium">{item.reason}</span>
                                        <div className="flex-grow bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                                            <div className="bg-red-400 dark:bg-red-500 h-4 rounded-full" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                        <span className="w-8 text-right font-bold text-gray-800 dark:text-slate-200">{item.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-400 dark:text-slate-500 border-t border-gray-200 dark:border-slate-700">
                            <p>Nenhum negócio perdido com motivo registrado.</p>
                            <p className="text-xs">Quando um negócio for perdido, registre o motivo para ver a análise aqui.</p>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '800ms' }}>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                        <UserGroupIcon className="w-6 h-6 mr-3 text-yellow-500 dark:text-yellow-400"/>
                        Top 5 Clientes por Faturamento
                    </h2>
                    {topClients.length > 0 ? (
                        <div className="border-t border-gray-200 dark:border-slate-700">
                            <table className="w-full text-left">
                                <thead className="text-gray-500 dark:text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Cliente</th>
                                        <th className="p-3 text-right">Total Faturado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topClients.map((client, index) => (
                                        <tr key={index} className="border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                                            <td className="p-3 text-gray-800 dark:text-slate-200 font-semibold">{client.name}</td>
                                            <td className="p-3 text-right text-gray-700 dark:text-slate-300 font-medium">{formatCurrency(client.value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-400 dark:text-slate-500 border-t border-gray-200 dark:border-slate-700">
                            <p>Nenhum cliente com negócios faturados para exibir.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsView;