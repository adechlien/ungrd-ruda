/** Selector desplegable reutilizable que reemplaza al <select> nativo y expone una API con @Input y @Output. */
import { Component, ElementRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';

@Component({
  selector: 'app-custom-select',
  host: { class: 'block text-sm' },
  imports: [TablerIconComponent],
  template: `
    <div class="relative">
      <button type="button" class="outlined-control flex h-10.5 w-full items-center gap-2 rounded-lg border border-form-border bg-surface px-3 text-left text-sm text-ink transition hover:border-brand-purple focus:outline-none focus:ring-3 focus:ring-brand-purple/15 disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-placeholder" [id]="controlId" role="combobox" [attr.aria-expanded]="open()" [disabled]="disabled" (click)="toggle()">
        @if (value && optionIcons[value]) { <tabler-icon class="shrink-0 text-brand-purple" [icon]="optionIcons[value]" [size]="19" /> }
        <span class="min-w-0 flex-1 truncate" [class.text-placeholder]="!value">{{ selectedLabel }}</span>
        <tabler-icon class="shrink-0 text-brand-purple transition-transform" [class.rotate-180]="open()" icon="chevron-down" [size]="18" />
      </button>
      @if (open()) {
        <button type="button" class="fixed inset-0 z-20 cursor-default border-0 bg-transparent" aria-label="Cerrar opciones" (click)="open.set(false)"></button>
        <div class="absolute left-0 right-0 z-30 max-h-64 overflow-y-auto rounded-xl border border-border-overlay bg-surface p-1.5 shadow-popup data-[placement=above]:bottom-[calc(100%+6px)] data-[placement=below]:top-[calc(100%+6px)]" [attr.data-placement]="openUp() ? 'above' : 'below'" role="listbox">
          @if (placeholder) {
            <button type="button" class="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-placeholder hover:bg-surface-muted" (click)="choose('')">{{ placeholder }}</button>
          }
          @for (option of options; track option) {
            <button type="button" class="flex min-h-10 w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-option hover:bg-surface-muted hover:text-brand-navy focus-visible:bg-surface-muted focus-visible:outline-none" [class.bg-surface-muted]="value === option" [class.font-bold]="value === option" [attr.aria-selected]="value === option" (click)="choose(option)">
              @if (optionIcons[option]) { <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-brand-purple"><tabler-icon [icon]="optionIcons[option]" [size]="19" /></span> }
              <span class="min-w-0 flex-1 break-words">{{ option }}</span>
              @if (value === option) { <tabler-icon class="shrink-0 text-brand-purple" icon="check" [size]="18" /> }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class CustomSelectComponent {
  // inject obtiene el elemento anfitrión mediante el sistema de inyección de dependencias.
  private readonly element = inject(ElementRef<HTMLElement>);
  // @Input recibe datos del padre; @Output emite acciones hacia el padre.
  @Input() options: string[] = [];
  @Input() optionIcons: Record<string, string> = {};
  @Input() value = '';
  @Input() placeholder = 'Seleccione una opción';
  @Input() disabled = false;
  @Input() controlId?: string;
  @Output() valueChange = new EventEmitter<string>();
  readonly open = signal(false);
  readonly openUp = signal(false);

  get selectedLabel(): string { return this.value || this.placeholder; }
  toggle(): void {
    // Decide si el panel abre hacia arriba según el espacio visible del navegador.
    if (this.disabled) return;
    if (!this.open()) {
      const rect = this.element.nativeElement.getBoundingClientRect();
      this.openUp.set(window.innerHeight - rect.bottom < 280 && rect.top > 280);
    }
    this.open.set(!this.open());
  }
  choose(value: string): void { this.valueChange.emit(value); this.open.set(false); }
}

