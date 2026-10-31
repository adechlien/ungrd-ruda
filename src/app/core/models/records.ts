import type { EventType } from '../../form/model/event-types';

export interface FormRecord {
  acta?: ActaFile | null;
  revisionRuda: 8;
  versionFormato?: number;
  id: string;
  status: 'pending' | 'completed';
  createdAt: string;
  savedAt: string;
  finishedAt?: string | null;
  activeSection: number;
  progress: number;
  story: string;
  selectedEvent: EventType;
  answers: Record<string, string>;
  members: Record<string, string>[];
  eventId: string | null;
  version: number;
}
export interface ActaFile {
  nombre: string;
  mime: string;
  bytes: number;
  creadoEn: string;
}
export interface SessionUser {
  id: string;
  funcionarioId: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  organizationType: string;
  document: string;
}
export interface EventRecordSummary {
  id: string;
  name: string;
  document: string | null;
  status: 'pending' | 'completed';
  updatedAt: string;
}
export interface SharedEvent {
  id: string;
  nombre: string;
  tipo: string;
  categoria: string | null;
  municipio: string | null;
  departamento: string | null;
  sector: string | null;
  direccion: string | null;
  fecha: string | null;
  hora: string | null;
  declarations: number;
  myDeclarations: number;
  households: number;
  affectedPeople: number;
  records: EventRecordSummary[];
}
export const EVENT_LABELS: Record<EventType, string> = {
  flood: 'Inundación / avalancha',
  coastal: 'Erosión costera',
  landslide: 'Deslizamiento',
  drought: 'Sequía',
  evacuation: 'Evacuación preventiva',
  fire: 'Incendio forestal',
  other: 'Otros eventos',
};
