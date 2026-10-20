/** Modal informativa de portada: administra la pestaña activa y presenta metadatos, definiciones y referencias legales. */
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';

// Identificadores de las cuatro pestañas disponibles en la modal de portada.
type SummaryTab = 'general' | 'legal' | 'reparacion' | 'definiciones';
@Component({ selector: 'app-summary-modal', imports: [TablerIconComponent], templateUrl: './summary-modal.component.html' })
export class SummaryModalComponent {
  // El padre entrega contenido con Inputs y escucha close para retirar la modal del DOM.
  @Input() coverInfo: any;
  @Input() definitions: any[] = [];
  @Input() repairComponents: any[] = [];
  @Input() legalReferences: any[] = [];
  @Output() close = new EventEmitter<void>();
  // La modal abre mostrando la pestaña "Información general".
  readonly activeTab = signal<SummaryTab>('general');
  // @for recorre esta configuración y evita escribir cuatro botones por separado.
  // Configuración visual y orden de las pestañas renderizadas en el HTML.
  readonly tabs: { id: SummaryTab; label: string; icon: string }[] = [
    { id: 'general', label: 'Información general', icon: 'info-circle' }, { id: 'definiciones', label: 'Definiciones', icon: 'book-2' }, { id: 'reparacion', label: 'Reparación integral', icon: 'users' }, { id: 'legal', label: 'Marco normativo', icon: 'scale' },
  ];
}
