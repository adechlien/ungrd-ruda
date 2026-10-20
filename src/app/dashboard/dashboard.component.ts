import { buildStatistics, StatisticsGroup } from './statistics';
import { Component, ElementRef, HostListener, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TablerIconComponent } from '@tabler/icons-angular';
import { EVENT_LABELS, FormRecord, FormRecordsService } from './form-records.service';
import { CustomSelectComponent } from '../custom-select.component';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe, TablerIconComponent, CustomSelectComponent],
  templateUrl: './dashboard.component.html',
  host: { class: 'block min-h-[65vh] bg-surface text-ink' },
})
export class DashboardComponent {
  @ViewChild('eventDialog') private eventDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('searchTools') private searchTools?: ElementRef<HTMLElement>;
  @ViewChild('searchOptionsButton') private searchOptionsButton?: ElementRef<HTMLButtonElement>;
  readonly searchOptionsOpen = signal(false);
  readonly allEventTypesLabel = 'Todos los tipos de evento';
  readonly sortIcons: Record<string, string> = { Fecha: 'calendar', Sitio: 'map-pin', Evento: 'cloud-storm' };
  readonly store = inject(FormRecordsService);
  readonly openForm = output<FormRecord>();
  readonly createForm = output<void>();
  readonly eventFilter = signal('');
  readonly tab = input<'forms' | 'events' | 'stats'>('forms');
  readonly filter = signal('all');
  readonly sortBy = signal('Fecha');
  readonly sortOptions = ['Fecha', 'Sitio', 'Evento'];
  readonly query = signal('');
  readonly page = signal(1);
  readonly pageSize = 8;
  readonly statisticsTab = signal<StatisticsGroup>('overview');
  readonly eventQuery = signal('');
  readonly expandedEvent = signal<string | null>(null);
  readonly eventLabels = EVENT_LABELS;
  readonly completed = computed(
    () => this.store.records().filter((r) => r.status === 'completed').length,
  );
  readonly pending = computed(() => this.store.records().length - this.completed());
  readonly filtered = computed(() => {
    const query = this.normalize(this.query());
    return this.store
      .records()
      .filter(
        (r) =>
          (this.filter() === 'all' || r.status === this.filter()) &&
          (!this.eventFilter() || r.answers['section-2-29'] === this.eventFilter()) &&
          this.normalize(
            [
              r.id,
              this.name(r),
              r.answers['section-1-2'],
              this.eventLabels[r.selectedEvent],
              r.answers['section-1-12'],
            ].join(' '),
          ).includes(query),
      )
      .sort((a, b) => this.compareRecords(a, b));
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.pages() }, (_, index) => index + 1),
  );
  readonly visible = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  readonly domainStats = computed(() => buildStatistics(this.store.records(), this.store.events()));
  readonly filteredEvents = computed(() => {
    const query = this.normalize(this.eventQuery());
    return this.store.events().filter(event => this.normalize([
      event.nombre, event.tipo, event.categoria, event.municipio, event.departamento,
      event.fecha, ...(event.records ?? []).flatMap(record => [record.name, record.document, record.id]),
    ].filter(Boolean).join(' ')).includes(query));
  });
  readonly selectedEvent = computed(() =>
    this.store.events().find(event => event.id === this.expandedEvent()) ?? null,
  );
  readonly eventFilterOptions = computed(() =>
    [this.allEventTypesLabel, ...[...new Set(this.store.records().map(record => record.answers['section-2-29']).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }))],
  );
  readonly eventFilterIcons = computed(() => Object.fromEntries(this.eventFilterOptions().map(label => [label,
    label === this.allEventTypesLabel ? 'layers-intersect' : label === 'Desastres' ? 'cloud-storm' : 'leaf',
  ])));
  readonly selectedEventFilterLabel = computed(() => this.eventFilter() || this.allEventTypesLabel);
  readonly eventTotals = computed(() => ({
    households: this.store.events().reduce((total, event) => total + event.households, 0),
    people: this.store.events().reduce((total, event) => total + event.affectedPeople, 0),
  }));
  readonly visibleStatCharts = computed(() =>
    this.domainStats().charts.filter((chart) => chart.group === this.statisticsTab()),
  );
  name(record: FormRecord): string {
    return (
      ['5', '6', '3', '4']
        .map((id) => record.answers[`section-1-${id}`])
        .filter(Boolean)
        .join(' ') || 'Nuevo declarante'
    );
  }
  setFilter(value: string): void {
    this.filter.set(value);
    this.page.set(1);
  }
  search(value: string): void {
    this.query.set(value);
    this.page.set(1);
  }
  chooseEventFilter(label: string): void {
    this.eventFilter.set(label === this.allEventTypesLabel ? '' : label);
    this.page.set(1);
  }
  @HostListener('document:click', ['$event'])
  closeSearchOptionsOutside(event: MouseEvent): void {
    if (event.target instanceof Node && !this.searchTools?.nativeElement.contains(event.target)) {
      this.searchOptionsOpen.set(false);
    }
  }
  @HostListener('document:keydown.escape')
  closeSearchOptions(): void {
    if (!this.searchOptionsOpen()) return;
    this.searchOptionsOpen.set(false);
    this.searchOptionsButton?.nativeElement.focus();
  }
  chooseSort(value: string): void { this.sortBy.set(value || 'Fecha'); this.page.set(1); }
  toggleEvent(id: string): void {
    this.expandedEvent.set(id);
    if (!this.eventDialog?.nativeElement.open) this.eventDialog?.nativeElement.showModal();
  }
  closeEventModal(): void {
    if (this.eventDialog?.nativeElement.open) this.eventDialog.nativeElement.close();
    this.expandedEvent.set(null);
  }
  openEventRecord(id: string): void {
    const record = this.store.records().find(item => item.id === id);
    if (record) this.openForm.emit(record);
  }
  eventCode(id: string): string { return `EVT-${String(id).padStart(5, '0')}`; }
  private compareRecords(first: FormRecord, second: FormRecord): number {
    const value=(record:FormRecord,key:string,fallback='')=>record.answers[key]||fallback;
    if(this.sortBy()==='Sitio')return value(first,'section-2-26',value(first,'section-1-12')).localeCompare(value(second,'section-2-26',value(second,'section-1-12')),'es',{sensitivity:'base'})||second.savedAt.localeCompare(first.savedAt);
    if(this.sortBy()==='Evento')return value(first,'section-2-30',this.eventLabels[first.selectedEvent]).localeCompare(value(second,'section-2-30',this.eventLabels[second.selectedEvent]),'es',{sensitivity:'base'})||second.savedAt.localeCompare(first.savedAt);
    return value(second,'section-2-23',second.savedAt).localeCompare(value(first,'section-2-23',first.savedAt))||second.savedAt.localeCompare(first.savedAt);
  }
  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
