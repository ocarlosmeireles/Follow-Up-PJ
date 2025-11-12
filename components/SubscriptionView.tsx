import React, { useState } from 'react';
import type { Organization } from '../types';
import type { User } from 'firebase/auth';
import { BriefcaseIcon, CheckCircleIcon, CurrencyDollarIcon, XCircleIcon } from './icons';

interface SubscriptionViewProps {
  organization: Organization | null;
  user: User | null;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ organization, user }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubscribe = async () => {
        setLoading(true);
        setError('');
        
        // --- Placeholder for Stripe Integration ---
        // In a real application, this would call a Firebase Function
        // which then creates a Stripe Checkout session.
        console.log("Iniciando processo de assinatura para a organização:", organization?.id);
        
        // Simulate a network request
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // On success, the Firebase Function would return a URL to redirect to.
        // window.location.href = checkoutSessionUrl;

        // For this example, we'll just show an error message.
        setError('A integração de pagamento ainda não está ativa. Esta é uma demonstração do fluxo.');
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <BriefcaseIcon className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-500" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-4">
                        Ative sua Conta na {organization?.name || 'Plataforma'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                        Escolha um plano para desbloquear todas as ferramentas e começar a impulsionar suas vendas.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 border border-gray-200 dark:border-slate-700">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-500">Plano Profissional</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Acesso completo para equipes de alta performance.</p>

                        <div className="my-6">
                            <span className="text-5xl font-extrabold text-gray-900 dark:text-slate-100">R$99</span>
                            <span className="text-lg font-medium text-gray-500 dark:text-gray-400">,90</span>
                            <span className="text-gray-500 dark:text-gray-400"> /mês</span>
                        </div>
                        
                        <ul className="space-y-3 text-gray-600 dark:text-slate-300">
                            <li className="flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                Funil de Vendas e Prospecção
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                Hub de Clientes e Orçamentos
                            </li>
                             <li className="flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                Relatórios e Análises com IA
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                Usuários Ilimitados
                            </li>
                        </ul>
                    </div>
                    <div className="w-full md:w-auto flex-shrink-0 text-center">
                        <button
                            onClick={handleSubscribe}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg text-lg disabled:bg-blue-400 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {loading ? (
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : 'Assinar Agora'}
                        </button>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Pagamento seguro via Stripe.</p>

                        {error && (
                            <div className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/40 p-3 rounded-lg flex items-center gap-2">
                                <XCircleIcon className="w-5 h-5" />
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                    Se você acredita que isso é um erro, por favor, entre em contato com nosso suporte.
                </p>
            </div>
        </div>
    );
};

export default SubscriptionView;