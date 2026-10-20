/** Selector de fecha reutilizable: encapsula la navegación del calendario y comunica el valor al componente padre. */
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';

interface CalendarDay { date: Date; label: string; currentMonth: boolean; iso: string; }
// Una unión literal limita la vista a estos tres estados válidos.
type CalendarView = 'days' | 'months' | 'years';

@Component({
  selector: 'app-custom-date-picker',
  host: { class: 'block text-sm' },
  imports: [TablerIconComponent],
  template: `
    <div class="relative">
      <div class="outlined-control flex h-10.5 w-full items-center rounded-lg border border-form-border bg-surface transition hover:border-brand-purple focus-within:border-brand-purple focus-within:ring-3 focus-within:ring-brand-purple/15" [class.border-danger-border]="manualInvalid()">
        <input class="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-placeholder" [id]="controlId" type="text" inputmode="numeric" maxlength="10" autocomplete="off" placeholder="dd/mm/aaaa" [value]="manualText()" [attr.aria-invalid]="manualInvalid()" (input)="onManualInput($event)" />
        <button type="button" class="grid h-full w-10 shrink-0 place-items-center rounded-r-lg text-brand-purple outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-purple/30" aria-label="Abrir calendario" [attr.aria-expanded]="open()" (click)="toggle()"><tabler-icon icon="calendar-week" [size]="19" /></button>
      </div>
      @if (open()) {
        <button type="button" class="fixed inset-0 z-20 cursor-default border-0 bg-transparent" aria-label="Cerrar calendario" (click)="open.set(false)"></button>
        <div class="absolute left-0 z-30 w-73 rounded-xl border border-border-overlay bg-surface p-3 shadow-popup max-sm:w-full data-[placement=above]:bottom-[calc(100%+6px)] data-[placement=below]:top-[calc(100%+6px)]" [attr.data-placement]="openUp() ? 'above' : 'below'" role="dialog" aria-label="Seleccionar fecha">
          <div class="mb-3 flex items-center justify-between">
            <button type="button" class="rounded-md px-1 py-1 text-left text-sm font-bold capitalize text-brand-navy hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-purple/20" (click)="showBroaderView()">{{ headerLabel }}</button>
            <div class="flex gap-1"><button type="button" class="grid size-8 place-items-center rounded-lg text-brand-navy hover:bg-surface-muted" aria-label="Anterior" (click)="navigate(-1)"><tabler-icon icon="chevron-left" [size]="19" /></button><button type="button" class="grid size-8 place-items-center rounded-lg text-brand-navy hover:bg-surface-muted" aria-label="Siguiente" (click)="navigate(1)"><tabler-icon icon="chevron-right" [size]="19" /></button></div>
          </div>
          @if (view() === 'days') {
            <div class="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted"><span class="py-1">DO</span><span class="py-1">LU</span><span class="py-1">MA</span><span class="py-1">MI</span><span class="py-1">JU</span><span class="py-1">VI</span><span class="py-1">SÁ</span></div>
            <div class="mt-1 grid grid-cols-7 gap-1">
              @for (day of calendarDays; track day.iso) {
                <button type="button" class="grid size-8 place-items-center rounded-lg text-xs hover:bg-surface-icon hover:text-brand-navy" [class.text-subtle]="!day.currentMonth" [class.bg-brand-purple]="value === day.iso" [class.text-surface]="value === day.iso" [class.font-bold]="value === day.iso" [textContent]="day.label" (click)="choose(day.iso)"></button>
              }
            </div>
          } @else if (view() === 'months') {
            <div class="grid grid-cols-3 gap-2 py-2">
              @for (month of months; track $index; let i = $index) {
                <button type="button" class="min-h-11 rounded-lg px-2 text-xs capitalize text-body hover:bg-surface-icon hover:text-brand-navy" [class.bg-surface-muted]="viewDate.getMonth() === i" [class.font-bold]="viewDate.getMonth() === i" [class.text-brand-purple]="viewDate.getMonth() === i" (click)="selectMonth(i)">{{ month }}</button>
              }
            </div>
          } @else {
            <div class="grid grid-cols-3 gap-2 py-2">
              @for (year of visibleYears; track year) {
                <button type="button" class="min-h-11 rounded-lg px-2 text-xs text-body hover:bg-surface-icon hover:text-brand-navy" [class.bg-surface-muted]="viewDate.getFullYear() === year" [class.font-bold]="viewDate.getFullYear() === year" [class.text-brand-purple]="viewDate.getFullYear() === year" (click)="selectYear(year)">{{ year }}</button>
              }
            </div>
          }
          <div class="mt-3 flex justify-between border-t border-divider-soft pt-2"><button type="button" class="rounded-md px-2 py-1 text-xs text-brand-purple hover:bg-surface-muted" (click)="choose('')">Borrar</button><button type="button" class="rounded-md px-2 py-1 text-xs font-bold text-brand-purple hover:bg-surface-muted" (click)="chooseToday()">Hoy</button></div>
        </div>
      }
    </div>
  `,
})
export class CustomDatePickerComponent implements OnChanges {
  private readonly element = inject(ElementRef<HTMLElement>);
  @Input() value = '';
  @Input() controlId?: string;
  @Output() valueChange = new EventEmitter<string>();
  // Signals locales controlan el popup sin trasladar este detalle al componente padre.
  readonly open = signal(false);
  readonly openUp = signal(false);
  readonly view = signal<CalendarView>('days');
  readonly manualText = signal('');
  readonly manualInvalid = signal(false);
  readonly months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  viewDate = new Date();

  // Angular ejecuta ngOnChanges cuando el padre entrega un nuevo valor al @Input.
  ngOnChanges(): void {
    this.manualText.set(this.value ? this.formatIsoForDisplay(this.value) : '');
    this.manualInvalid.set(false);
    if (this.value) this.viewDate = this.fromIso(this.value);
  }
  get monthLabel(): string { return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(this.viewDate); }
  get yearPageStart(): number { return Math.floor(this.viewDate.getFullYear() / 12) * 12; }
  get visibleYears(): number[] { return Array.from({ length: 12 }, (_, index) => this.yearPageStart + index); }
  get headerLabel(): string {
    if (this.view() === 'days') return this.monthLabel;
    if (this.view() === 'months') return String(this.viewDate.getFullYear());
    return `${this.yearPageStart} – ${this.yearPageStart + 11}`;
  }
  get calendarDays(): CalendarDay[] {
    // Se generan siempre seis semanas para mantener estable el tamaño del calendario.
    const year = this.viewDate.getFullYear(); const month = this.viewDate.getMonth();
    const start = new Date(year, month, 1 - new Date(year, month, 1).getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return { date, label: String(date.getDate()), currentMonth: date.getMonth() === month, iso: this.toIso(date) }; });
  }
  toggle(): void {
    if (!this.open()) {
      if (this.value) this.viewDate = this.fromIso(this.value);
      this.view.set('days');
      const rect = this.element.nativeElement.getBoundingClientRect();
      this.openUp.set(window.innerHeight - rect.bottom < 380 && rect.top > 380);
    }
    this.open.set(!this.open());
  }
  showBroaderView(): void { this.view.update((view) => view === 'days' ? 'months' : 'years'); }
  navigate(offset: number): void {
    if (this.view() === 'days') this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + offset, 1);
    else if (this.view() === 'months') this.viewDate = new Date(this.viewDate.getFullYear() + offset, this.viewDate.getMonth(), 1);
    else this.viewDate = new Date(this.viewDate.getFullYear() + offset * 12, this.viewDate.getMonth(), 1);
  }
  selectMonth(month: number): void { this.viewDate = new Date(this.viewDate.getFullYear(), month, 1); this.view.set('days'); }
  selectYear(year: number): void { this.viewDate = new Date(year, this.viewDate.getMonth(), 1); this.view.set('months'); }
  onManualInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    this.manualText.set(formatted);
    input.value = formatted;
    if (!formatted) { this.manualInvalid.set(false); this.valueChange.emit(''); return; }
    const iso = this.parseManualDate(formatted);
    this.manualInvalid.set(formatted.length === 10 && !iso);
    if (iso) { this.viewDate = this.fromIso(iso); this.valueChange.emit(iso); }
  }
  choose(value: string): void {
    this.manualText.set(value ? this.formatIsoForDisplay(value) : '');
    this.manualInvalid.set(false);
    this.valueChange.emit(value);
    this.open.set(false);
  }
  chooseToday(): void { this.choose(this.toIso(new Date())); }
  private parseManualDate(value: string): string | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;
    const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? this.toIso(date) : null;
  }
  private formatIsoForDisplay(value: string): string { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
  private toIso(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private fromIso(value: string): Date { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); }
}

