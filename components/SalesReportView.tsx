import React, { useState, useMemo } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { PrinterIcon } from './icons';

// Props
interface SalesReportViewProps {
  budgets: Budget[];
  clients: Client[];
}

// Helper Functions
const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// Main Component
const SalesReportView: React.FC<SalesReportViewProps> = ({ budgets, clients }) => {
  // State for filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | 'all'>('all');

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  // Memoized filtered data
  const filteredBudgets = useMemo(() => {
    return budgets.filter(budget => {
      // Create a date object that ignores time and timezone for comparison
      const budgetDateParts = budget.dateSent.split('-').map(Number);
      const budgetDate = new Date(Date.UTC(budgetDateParts[0], budgetDateParts[1] - 1, budgetDateParts[2]));

      // Date filtering
      if (startDate) {
        const startParts = startDate.split('-').map(Number);
        const start = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
        if (budgetDate < start) return false;
      }
      if (endDate) {
        const endParts = endDate.split('-').map(Number);
        const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));
        if (budgetDate > end) return false;
      }

      // Status filtering
      if (statusFilter !== 'all' && budget.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [budgets, startDate, endDate, statusFilter]);
  
  // Memoized summary metrics
  const summary = useMemo(() => {
    const totalValue = filteredBudgets.reduce((sum, b) => sum + b.value, 0);
    const count = filteredBudgets.length;
    return { totalValue, count };
  }, [filteredBudgets]);

  // Export to CSV function
  const exportToCSV = () => {
    const headers = ["Nome do Orçamento", "Nome do Cliente", "Valor", "Status", "Data de Envio"];
    const rows = filteredBudgets.map(b => [
        `"${b.title.replace(/"/g, '""')}"`,
        `"${(clientMap.get(b.clientId) || 'N/A').replace(/"/g, '""')}"`,
        b.value.toString().replace('.',','), // Use comma for decimal separator in CSV for Brazilian Excel
        b.status,
        formatDate(b.dateSent)
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(";") + "\n" // Use semicolon for Brazilian Excel
        + rows.map(e => e.join(";")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_vendas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
    const getStatusStyles = (status: BudgetStatus) => {
      const styles: {[key in BudgetStatus]: string} = {
        [BudgetStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [BudgetStatus.FOLLOWING_UP]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [BudgetStatus.ORDER_PLACED]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        [BudgetStatus.INVOICED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
        [BudgetStatus.LOST]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [BudgetStatus.ON_HOLD]: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
      };
      return styles[status] || styles[BudgetStatus.ON_HOLD];
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Relatório de Vendas</h1>
        <p className="text-[var(--text-secondary)]">Filtre e analise seus orçamentos para extrair insights valiosos.</p>
      </div>

      <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Date Filters */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Data Inicial</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] dark:[color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Data Final</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] dark:[color-scheme:dark]" />
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as BudgetStatus | 'all')} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]">
              <option value="all">Todos</option>
              {Object.values(BudgetStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <button onClick={exportToCSV} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm">
            <PrinterIcon className="w-5 h-5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Total de Orçamentos Filtrados</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{summary.count}</p>
          </div>
           <div className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Valor Total dos Orçamentos (R$)</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{formatCurrency(summary.totalValue)}</p>
          </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--background-tertiary)] text-[var(--text-secondary)] uppercase text-xs">
              <tr>
                <th className="p-3">Nome do Orçamento</th>
                <th className="p-3">Nome do Cliente</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Data de Envio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {filteredBudgets.map((budget, index) => (
                <tr key={budget.id} className="hover:bg-[var(--background-secondary-hover)] transition-colors animated-item" style={{ animationDelay: `${index * 30}ms`}}>
                  <td className="p-3 font-bold text-[var(--text-primary)]">{budget.title}</td>
                  <td className="p-3 text-[var(--text-primary)]">{clientMap.get(budget.clientId) || 'N/A'}</td>
                  <td className="p-3 text-right font-semibold text-[var(--text-primary)]">R$ {formatCurrency(budget.value)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${getStatusStyles(budget.status)}`}>
                        {budget.status}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">{formatDate(budget.dateSent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
           {filteredBudgets.length === 0 && (
              <div className="text-center py-16 text-[var(--text-tertiary)]">
                <p className="font-semibold">Nenhum resultado encontrado.</p>
                <p className="text-sm">Ajuste os filtros para encontrar os dados desejados.</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReportView;
