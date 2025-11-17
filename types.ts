export enum BudgetStatus {
  SENT = 'Enviado',
  FOLLOWING_UP = 'Em Follow-up',
  ON_HOLD = 'Congelado',
  ORDER_PLACED = 'Pedido Emitido',
  INVOICED = 'Faturado',
  LOST = 'Perdido',
}

export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  SALESPERSON = 'Salesperson',
  SUPER_ADMIN = 'Super Admin',
}

export enum FollowUpStatus {
  WAITING_RESPONSE = 'Aguardando Resposta',
  COMPLETED = 'Concluído',
  RESCHEDULED = 'Reagendado',
}

export interface Organization {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  logoUrl?: string;
  companyInfo?: string; // Could be used for address, phone, etc.
  // Campos para gerenciamento de assinatura
  subscriptionStatus?: 'trial' | 'active' | 'past_due' | 'unpaid' | 'canceled';
}

export interface Invite {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  status: 'pending' | 'completed';
}

export interface Contact {
  id: string;
  clientId: string;
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Client {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  address?: string;
  cnpj?: string;
  notes?: string;
  logoUrl?: string;
}

export interface FollowUp {
  id: string;
  date: string;
  notes: string;
  status?: FollowUpStatus;
}

export interface Budget {
  id: string;
  userId: string;
  organizationId: string;
  clientId: string;
  contactId: string | null;
  title: string;
  value: number;
  status: BudgetStatus;
  dateSent: string;
  nextFollowUpDate: string | null;
  followUps: FollowUp[];
  observations?: string;
  lostReason?: string;
  lostNotes?: string;
}

export interface ProspectingStage {
  id: string;
  name: string;
  order: number;
  organizationId: string;
}

export interface Prospect {
  id:string;
  userId: string;
  organizationId: string;
  name: string; // Contact person's name
  company: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  notes?: string; // Observações estratégicas
  stageId: string;
  source?: string; // Canal em que descobri
  createdAt: string;
  nextContactDate?: string | null;

  // New fields from user request
  segment?: string;
  companySize?: 'Pequena' | 'Média' | 'Grande';
  address?: string;
  landline?: string;
  website?: string;
  socialMedia?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  role?: string; // Cargo
  identifiedNeed?: string;
  productsOfInterest?: string;
  estimatedBudget?: number;
  urgencyLevel?: 'Baixa' | 'Média' | 'Alta';
}


export interface Notification {
  id: string;
  type: 'overdue' | 'today';
  message: string;
  budgetId: string;
  clientName: string;
}

export interface UserProfile {
  name: string;
  matricula: string;
  email: string;
  role: UserRole;
  organizationId: string;
  monthlyGoal?: number;
}

export interface UserData extends UserProfile {
  id: string;
}

export interface Reminder {
  id: string;
  userId: string;
  organizationId: string;
  title: string;
  reminderDateTime: string; // ISO string
  isDismissed: boolean;
  isCompleted: boolean;
}

export type ThemeVariant = 'classic' | 'vibrant' | 'flow' | 'dashboard' | 'aurora';
// FIX: Moved Theme type here to be accessible globally and fix import errors.
export type Theme = 'light' | 'dark';

export interface PriorityDeal {
    budgetId: string;
    priorityScore: number;
    nextBestAction: string;
    rationale: string;
}

export type ScriptCategory = 'Prospecção Fria' | 'Follow-up Pós-Envio' | 'Reuniões e Apresentações' | 'Reengajamento' | 'Negociação e Fechamento' | 'Pós-Venda';

export const scriptCategories: ScriptCategory[] = [
    'Prospecção Fria',
    'Follow-up Pós-Envio',
    'Reuniões e Apresentações',
    'Reengajamento',
    'Negociação e Fechamento',
    'Pós-Venda'
];

export interface Script {
  id: string;
  organizationId: string;
  userId: string; // creator
  title: string;
  content: string;
  category: ScriptCategory;
}

export interface DailyBriefing {
  greeting: string;
  priorities: { text: string; budgetId?: string }[];
  warnings: { text: string; budgetId?: string }[];
  quickWins: { text: string; budgetId?: string }[];
  motivation: string;
}