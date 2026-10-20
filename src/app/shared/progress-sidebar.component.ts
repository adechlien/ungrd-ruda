/** Panel lateral de progreso: recibe métricas ya calculadas y las presenta sin modificar el estado del formulario. */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';
export interface RecordSummary { name: string; document: string; event: string; }

@Component({ selector: 'app-progress-sidebar', imports: [TablerIconComponent], templateUrl: './progress-sidebar.component.html' })
export class ProgressSidebarComponent {
  // Componente presentacional: todos sus valores llegan mediante property binding [propiedad].
  @Input() recordId = '';
  @Input() recordSummary: RecordSummary | null = null;
  @Output() coverRequested = new EventEmitter<void>();
  @Output() partialFillRequested = new EventEmitter<void>();
  @Output() completeFillRequested = new EventEmitter<void>();
  @Input() totalAnswered = 0;
  @Input() totalFields = 0;
  @Input() totalPercentage = 0;
  @Input() sectionAnswered = 0;
  @Input() sectionFields = 0;
  @Input() sectionPercentage = 0;
  @Input() validation: { valid: boolean; issues: number; questionLabels: string[] } = { valid: true, issues: 0, questionLabels: [] };
}
