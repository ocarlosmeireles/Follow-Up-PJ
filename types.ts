export enum BudgetStatus {
  SENT = 'Enviado',
  FOLLOWING_UP = 'Em Follow-up',
  ON_HOLD = 'Congelado',
  WON = 'Ganho',
  LOST = 'Perdido',
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Client {
  id: string;
  name: string;
  address?: string;
  cnpj?: string;
}

export interface FollowUp {
  id: string;
  date: string;
  notes: string;
  audioUrl?: string;
}

export interface Budget {
  id: string;
  clientId: string;
  contactId: string | null;
  title: string;
  value: number;
  status: BudgetStatus;
  dateSent: string;
  nextFollowUpDate: string | null;
  followUps: FollowUp[];
  observations?: string;
}

export interface ProspectingStage {
  id: string;
  name: string;
  order: number;
}

export interface Prospect {
  id: string;
  name: string; // Contact person's name
  company: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  notes?: string;
  stageId: string;
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
}
