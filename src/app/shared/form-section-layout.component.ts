/** Layout reutilizable de una sección: compone contenido proyectado, navegación, guardado y barra lateral de progreso. */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';
import { ProgressSidebarComponent, RecordSummary } from './progress-sidebar.component';

export interface FormProgressState {
  // Contrato compartido entre el componente raíz, la sección y el panel lateral.
  totalAnswered: number;
  totalFields: number;
  totalPercentage: number;
  sectionAnswered: number;
  sectionFields: number;
  sectionPercentage: number;
  validation: { valid: boolean; issues: number; questionLabels: string[] };
}

@Component({
  selector: 'app-form-section-layout',
  imports: [TablerIconComponent, ProgressSidebarComponent],
  template: `
    <div class="mx-auto grid w-full max-w-280 grid-cols-10 items-start gap-4 max-[1160px]:grid-cols-1 max-sm:block">
      <section class="col-span-8 overflow-visible rounded-lg border border-form-border bg-surface max-[1040px]:col-span-1">
        <div class="p-5 max-sm:px-5 max-sm:pb-15 max-sm:pt-7">
          <h1 class="m-0 text-3xl font-bold tracking-tight text-brand-navy">{{ title }}</h1>
          <p class="mb-4 mt-2 max-w-230 text-base leading-snug text-form-muted max-sm:text-lg">{{ subtitle }}</p>
          <!-- Proyección de contenido: Angular inserta aquí lo escrito dentro de <app-form-section-layout>. -->
          <ng-content />
        </div>
        @if (activeSection < 6) {
          <div class="flex items-center justify-end border-t border-form-border p-3">
            <button type="button" class="flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-5 py-2 text-sm text-surface" (click)="sectionChange.emit(activeSection + 1)">Continuar<tabler-icon icon="chevron-right" [size]="24" /></button>
          </div>
        }
      </section>
      <app-progress-sidebar [recordId]="recordId" [recordSummary]="recordSummary" class="col-span-2 min-w-0 max-[1160px]:col-span-1" [totalAnswered]="progress.totalAnswered" [totalFields]="progress.totalFields" [totalPercentage]="progress.totalPercentage" [sectionAnswered]="progress.sectionAnswered" [sectionFields]="progress.sectionFields" [sectionPercentage]="progress.sectionPercentage" [validation]="progress.validation" (coverRequested)="coverRequested.emit()" (partialFillRequested)="partialFillRequested.emit()" (completeFillRequested)="completeFillRequested.emit()" />
    </div>
  `,
})
export class FormSectionLayoutComponent {
  // Inputs configuran el layout; sectionChange devuelve al padre la navegación solicitada.
  @Input() title = '';
  @Input() subtitle = '';
  @Input() activeSection = 1;
  @Input() recordId = '';
  @Input() recordSummary: RecordSummary | null = null;
  @Output() coverRequested = new EventEmitter<void>();
  @Input() canFinish = false;
  @Input() lastSavedAt: Date | null = null;
  @Input() progress!: FormProgressState;
  @Output() saveRequested = new EventEmitter<void>();
  @Output() finishRequested = new EventEmitter<void>();
  @Output() partialFillRequested = new EventEmitter<void>();
  @Output() completeFillRequested = new EventEmitter<void>();
  @Output() sectionChange = new EventEmitter<number>();
}
