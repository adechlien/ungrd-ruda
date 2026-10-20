/** Indicador reactivo del guardado local: convierte una fecha en texto relativo y lo actualiza periódicamente. */
import { Component, Input, OnDestroy, signal } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';

@Component({
  selector: 'app-local-save-status',
  host: { class: 'block' },
  imports: [TablerIconComponent],
  template: `<span class="flex items-center gap-1.5 whitespace-nowrap text-xs" [class.text-muted]="isRecent" [class.text-warning-icon]="!isRecent"><tabler-icon [class.text-brand-navy]="isRecent" [icon]="isRecent ? 'cloud-check' : 'cloud-x'" [size]="18" /> {{ label }}</span>`,
})
export class LocalSaveStatusComponent implements OnDestroy {
  // @Input cambia desde el padre; el signal now fuerza a reevaluar los getters cada 30 segundos.
  @Input() lastSavedAt: Date | null = null;
  private readonly timer = setInterval(() => this.now.set(Date.now()), 30_000);
  readonly now = signal(Date.now());

  get elapsedMilliseconds(): number { this.now(); return this.lastSavedAt ? Math.max(0, Date.now() - this.lastSavedAt.getTime()) : Number.POSITIVE_INFINITY; }
  get isRecent(): boolean { return this.elapsedMilliseconds < 60_000; }
  get label(): string {
    if (!this.lastSavedAt) return 'Aún no se ha guardado';
    const seconds = Math.floor(this.elapsedMilliseconds / 1000);
    if (seconds < 60) return 'Cambios guardados';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Último guardado hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Último guardado hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Último guardado hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }
  // Angular llama este ciclo de vida antes de destruir el componente; aquí se evita una fuga del temporizador.
  ngOnDestroy(): void { clearInterval(this.timer); }
}
