/** Encabezado institucional: muestra las marcas GOV.CO/UNGRD y comunica la apertura del resumen. */
import { Component, EventEmitter, Output } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';

@Component({
  selector: 'app-site-header',
  imports: [TablerIconComponent],
  templateUrl: './site-header.component.html',
})
export class SiteHeaderComponent {
  // El hijo avisa a App sin necesitar conocer cómo se abre o implementa la modal.
  @Output() summaryOpen = new EventEmitter<void>();
}
