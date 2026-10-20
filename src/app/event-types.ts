export type EventType = 'flood' | 'coastal' | 'landslide' | 'drought' | 'evacuation' | 'fire' | 'other';

export interface EventOption {
  id: EventType;
  label: string;
  icon: string;
  questions: string[];
}

export interface FormSection {
  number: number;
  title: string;
  enabled: boolean;
}
