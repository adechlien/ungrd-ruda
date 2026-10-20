import { Component, ElementRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { TablerIconComponent } from '@tabler/icons-angular';

@Component({
  selector: 'app-custom-time-picker',
  host: { class: 'block text-sm' },
  imports: [TablerIconComponent],
  template: `
    <div class="relative">
      <button type="button" class="outlined-control flex h-10.5 w-full items-center gap-2 rounded-lg border border-form-border bg-surface px-3 text-left text-sm text-ink transition hover:border-brand-purple focus:outline-none focus:ring-3 focus:ring-brand-purple/15" [id]="controlId" [attr.aria-expanded]="open()" (click)="toggle()">
        <span class="flex-1" [class.text-placeholder]="!value">{{ value || 'hh:mm' }}</span>
        <tabler-icon class="text-brand-purple" icon="clock" [size]="19" />
      </button>
      @if (open()) {
        <button type="button" class="fixed inset-0 z-20 cursor-default border-0 bg-transparent" aria-label="Cerrar selector de hora" (click)="open.set(false)"></button>
        <div class="absolute left-0 z-30 w-56 rounded-xl border border-border-overlay bg-surface p-3 shadow-popup data-[placement=above]:bottom-[calc(100%+6px)] data-[placement=below]:top-[calc(100%+6px)]" [attr.data-placement]="openUp() ? 'above' : 'below'" role="dialog" aria-label="Seleccionar hora">
          <div class="mb-2 grid grid-cols-2 gap-2 text-center text-xs font-bold uppercase tracking-wide text-muted"><span>Hora</span><span>Minutos</span></div>
          <div class="grid grid-cols-2 gap-2">
            <div class="max-h-48 overflow-y-auto rounded-lg bg-surface-soft p-1" role="listbox" aria-label="Horas">
              @for (hour of hours; track hour) { <button type="button" class="flex min-h-9 w-full items-center justify-center rounded-md text-sm text-body hover:bg-surface-selected hover:text-brand-navy" [class.bg-brand-purple]="selectedHour() === hour" [class.text-surface]="selectedHour() === hour" [class.font-bold]="selectedHour() === hour" (click)="chooseHour(hour)">{{ twoDigits(hour) }}</button> }
            </div>
            <div class="max-h-48 overflow-y-auto rounded-lg bg-surface-soft p-1" role="listbox" aria-label="Minutos">
              @for (minute of minutes; track minute) { <button type="button" class="flex min-h-9 w-full items-center justify-center rounded-md text-sm text-body hover:bg-surface-selected hover:text-brand-navy" [class.bg-brand-purple]="selectedMinute() === minute" [class.text-surface]="selectedMinute() === minute" [class.font-bold]="selectedMinute() === minute" (click)="chooseMinute(minute)">{{ twoDigits(minute) }}</button> }
            </div>
          </div>
          <div class="mt-3 flex justify-between border-t border-divider-soft pt-2"><button type="button" class="rounded-md px-2 py-1 text-xs text-brand-purple hover:bg-surface-muted" (click)="clear()">Borrar</button><button type="button" class="rounded-md px-2 py-1 text-xs font-bold text-brand-purple hover:bg-surface-muted" (click)="chooseNow()">Ahora</button></div>
        </div>
      }
    </div>
  `,
})
export class CustomTimePickerComponent {
  private readonly element = inject(ElementRef<HTMLElement>);
  @Input() value = '';
  @Input() controlId?: string;
  @Output() valueChange = new EventEmitter<string>();
  readonly open = signal(false);
  readonly openUp = signal(false);
  readonly selectedHour = signal<number | null>(null);
  readonly selectedMinute = signal<number | null>(null);
  readonly hours = Array.from({ length: 24 }, (_, index) => index);
  readonly minutes = Array.from({ length: 60 }, (_, index) => index);

  toggle(): void {
    if (!this.open()) {
      const [hour, minute] = this.value ? this.value.split(':').map(Number) : [null, null];
      this.selectedHour.set(hour);
      this.selectedMinute.set(minute);
      const rect = this.element.nativeElement.getBoundingClientRect();
      this.openUp.set(window.innerHeight - rect.bottom < 330 && rect.top > 330);
    }
    this.open.set(!this.open());
  }
  chooseHour(hour: number): void { this.selectedHour.set(hour); this.commitWhenComplete(); }
  chooseMinute(minute: number): void { this.selectedMinute.set(minute); this.commitWhenComplete(); }
  chooseNow(): void { const now = new Date(); this.valueChange.emit(`${this.twoDigits(now.getHours())}:${this.twoDigits(now.getMinutes())}`); this.open.set(false); }
  clear(): void { this.valueChange.emit(''); this.open.set(false); }
  twoDigits(value: number): string { return String(value).padStart(2, '0'); }
  private commitWhenComplete(): void { const hour = this.selectedHour(); const minute = this.selectedMinute(); if (hour !== null && minute !== null) { this.valueChange.emit(`${this.twoDigits(hour)}:${this.twoDigits(minute)}`); this.open.set(false); } }
}
