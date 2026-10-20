/** Componente principal del formulario dinámico: renderiza el esquema activo, valida entradas y emite cambios hacia App. */
import { Component, EventEmitter, Input, Output, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TablerIconComponent } from '@tabler/icons-angular';
import { EVENT_PRINCIPALS_BY_TYPE, SectionSchema, FormGroup } from '../form-schema';
import { CustomDatePickerComponent } from '../custom-date-picker.component';
import { CustomSelectComponent } from '../custom-select.component';
import { CustomTimePickerComponent } from '../custom-time-picker.component';
import { RecordSummary } from '../shared/progress-sidebar.component';
import { LocalSaveStatusComponent } from '../shared/local-save-status.component';
import { FormSectionLayoutComponent } from '../shared/form-section-layout.component';
import { departamentos } from 'colombia-territorial';
import { EventOption, EventType } from '../event-types';
import { guideCode, memberNeedsCompletion, expandedFields, repeatedKey, validBirthDate } from '../form-contract';
import { SharedEvent, ActaFile } from '../dashboard/form-records.service';

@Component({ selector: 'app-dynamic-form', imports: [FormsModule, TablerIconComponent, CustomDatePickerComponent, CustomSelectComponent, CustomTimePickerComponent, FormSectionLayoutComponent], templateUrl: './dynamic-form.component.html' })
export class DynamicFormComponent {
  @Output() repeatedRowRemoved = new EventEmitter<{section:number;ids:string[]}>();
  groupFields(group:FormGroup) {return expandedFields(this.activeSection,group.fields,this.answers);}
  repeatable(group:FormGroup):boolean {return Boolean(group.fields[0]&&repeatedKey(this.fieldKey(group.fields[0].id)));}
  repeatedRows(group:FormGroup):number[] {return [...new Set(this.groupFields(group).map(f=>Number(f.id.match(/--(\d+)$/)?.[1]||0)))].filter(Boolean);}
  addRepeatedRow(group:FormGroup):void {
    const row=Math.max(1,...this.repeatedRows(group))+1;if(row>100)return;
    this.fieldChange.emit({section:this.activeSection,id:group.fields[0].id+'--'+row,value:''});
  }
  removeRepeatedRow(group:FormGroup,row:number):void {this.repeatedRowRemoved.emit({section:this.activeSection,ids:group.fields.map(f=>f.id+'--'+row)});}
  @Input() acta:ActaFile|null=null;
  @Input() uploadingActa=false;
  @Output() actaSelected=new EventEmitter<File>();
  @Output() actaRemoved=new EventEmitter<void>();
  selectActa(event:Event):void {
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];if(file)this.actaSelected.emit(file);
    input.value='';
  }
  private readonly eventTypeIcons: Record<string,string> = {
    'Cambio climático':'cloud-storm',
    'Desastres':'alert-triangle',
    'Ambiental':'leaf',
    'Mixto':'layers-intersect',
    'Por determinar':'help-circle',
  };
  // Relacionan las preguntas de departamento con sus municipios dependientes.
  private readonly departmentToMunicipality: Record<string, string> = { '11': '12', '15': '16', '25': '26', '41': '42', '48': '49' };
  private readonly municipalityToDepartment: Record<string, string> = { '12': '11', '16': '15', '26': '25', '42': '41', '49': '48' };
  readonly departmentOptions = departamentos.map((department) => department.nombre);
  @Input() set householdMembers(value: Record<string,string>[]) {this.members.set(value || []);}
  @Output() membersChange = new EventEmitter<Record<string,string>[]>();
  private toastTimer?: ReturnType<typeof setTimeout>;
  // Inputs representan estado recibido; Outputs describen cambios que procesará App.
  @Input() schema: SectionSchema | null = null;
  @Input() activeSection = 1;
  @Input() recordId = '';
  @Input() recordSummary: RecordSummary | null = null;
  @Output() coverRequested = new EventEmitter<void>();
  @Input() canFinish = false;
  @Input() story = '';
  @Input() eventOptions: EventOption[] = [];
  @Input() selectedEvent!: EventType;
  @Input() selectedEventOption!: EventOption;
  @Input() selectedQuestions: string[] = [];
  @Input() answers: Record<string, string> = {};
  @Input() sharedEvents: SharedEvent[] = [];
  @Input() sharedEventId = '';
  @Input() ethnicApplies = false;
  @Input() lastSavedAt: Date | null = null;
  @Input() progress!: { totalAnswered: number; totalFields: number; totalPercentage: number; sectionAnswered: number; sectionFields: number; sectionPercentage: number; validation: { valid: boolean; issues: number; questionLabels: string[] } };
  @Output() fieldChange = new EventEmitter<{ section: number; id: string; value: string }>();
  @Output() sharedEventChange = new EventEmitter<string>();
  @Output() ethnicChange = new EventEmitter<string>();
  @Output() saveRequested = new EventEmitter<void>();
  @Output() finishRequested = new EventEmitter<void>();
  @Output() partialFillRequested = new EventEmitter<void>();
  @Output() completeFillRequested = new EventEmitter<void>();
  @Output() sectionChange = new EventEmitter<number>();
  @Output() storyChange = new EventEmitter<string>();
  @Output() eventChange = new EventEmitter<EventType>();
  @Output() answerChange = new EventEmitter<{ index: number; value: string }>();
  readonly eventMenuOpen = signal(false);
  readonly responseOptions = ['Sí', 'No', 'No sabe / No responde'];
  readonly memberModalOpen = signal(false);
  readonly members = signal<Record<string, string>[]>([]);
  readonly memberDraft = signal<Record<string, string>>({});
  readonly editingMemberIndex = signal<number | null>(null);
  readonly memberNeedsCompletion = memberNeedsCompletion;
  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  get sharedEventOptions(): string[] { return this.sharedEvents.map(event => this.sharedEventLabel(event)); }
  get sharedEventIcons(): Record<string, string> {
    return Object.fromEntries(this.sharedEvents.map(event => [this.sharedEventLabel(event), this.eventTypeIcon(event.categoria)]));
  }
  get selectedSharedEventLabel(): string {
    const event = this.sharedEvents.find(item => item.id === this.sharedEventId);
    return event ? this.sharedEventLabel(event) : '';
  }
  chooseSharedEvent(label: string): void {
    this.sharedEventChange.emit(this.sharedEvents.find(event => this.sharedEventLabel(event) === label)?.id || '');
  }
  private sharedEventLabel(event: SharedEvent): string {
    return `${event.nombre} · ${this.sharedEventDate(event.fecha)} · ${event.households} ${event.households === 1 ? 'hogar' : 'hogares'}`;
  }
  private sharedEventDate(value: string | null): string {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Fecha pendiente';
  }

  constructor() {
    // Este effect sincroniza un signal de Angular con una clase del DOM global.
    effect((onCleanup) => {
      if (this.memberModalOpen()) document.body.classList.add('member-modal-open');
      else document.body.classList.remove('member-modal-open');
      onCleanup(() => document.body.classList.remove('member-modal-open'));
    });
  }

  get memberFields() { return this.schema?.groups.find((group) => group.title === 'Miembros del hogar')?.fields ?? []; }
  answerKey(index: number): string { return 'guide-' + guideCode(this.selectedEvent,index); }
  chooseEvent(value: EventType): void { this.eventChange.emit(value); this.eventMenuOpen.set(false); }
  fieldKey(id: string): string { return `section-${this.activeSection}-${id}`; }
  setValue(id: string, value: string): void {
    value=String(value??'');
    if (this.activeSection === 6 && !this.ethnicApplies) return;
    // Cambiar departamento limpia el municipio previo para evitar datos incompatibles.
    const municipalityId = this.departmentToMunicipality[id];
    if (municipalityId && value !== this.answers[this.fieldKey(id)]) {
      this.fieldChange.emit({ section: this.activeSection, id: municipalityId, value: '' });
    }
    if (this.activeSection === 2 && id === '29' && value !== this.answers[this.fieldKey(id)]) {
      this.fieldChange.emit({ section: 2, id: '30', value: '' });
    }
    this.fieldChange.emit({ section: this.activeSection, id, value });
  }
  fieldOptions(id: string, fallback: string[] = []): string[] {
    if (this.activeSection === 2 && id === '30') return EVENT_PRINCIPALS_BY_TYPE[this.answers['section-2-29']] ?? [];
    if (this.departmentToMunicipality[id]) return this.departmentOptions;
    const departmentId = this.municipalityToDepartment[id];
    if (!departmentId) return fallback;
    const selectedDepartment = this.answers[this.fieldKey(departmentId)] ?? '';
    return (departamentos.find((department) => department.nombre === selectedDepartment)?.municipios.map((municipality) => municipality.nombre) ?? [])
      .sort((first, second) => first.localeCompare(second, 'es', { sensitivity: 'base' }));
  }
  fieldOptionIcons(id: string): Record<string, string> {
    if(this.activeSection!==2||!['29','30'].includes(id))return {};
    if(id==='29')return Object.fromEntries(this.fieldOptions(id).map(type=>[type,this.eventTypeIcon(type)]));
    const icon=this.eventTypeIcon(this.answers['section-2-29']);
    return Object.fromEntries(this.fieldOptions(id).map(option=>[option,icon]));
  }
  eventTypeIcon(type:string|null|undefined):string {return this.eventTypeIcons[type||'']||'help-circle';}
  isMunicipalityDisabled(id: string): boolean {
    if (this.activeSection === 2 && id === '30') return !this.answers['section-2-29'];
    const departmentId = this.municipalityToDepartment[id];
    return !!departmentId && !this.answers[this.fieldKey(departmentId)];
  }
  openMemberModal(): void { this.editingMemberIndex.set(null); this.memberDraft.set({}); this.memberModalOpen.set(true); }
  editMember(index: number): void { this.editingMemberIndex.set(index); this.memberDraft.set({ ...this.members()[index] }); this.memberModalOpen.set(true); }
  setMemberValue(id: string, value: string): void { this.memberDraft.update((draft) => ({ ...draft, [id]: value })); }
  addMember(): void {
    // update crea un arreglo nuevo para mantener una actualización de estado predecible.
    const validationError = this.validateMember();
    if (validationError) { this.showToast('error', validationError); return; }
    const member = { ...this.memberDraft() };
    if(memberNeedsCompletion(member))member['member-review']='Completo';
    const editingIndex = this.editingMemberIndex();
    this.members.update((members) => editingIndex === null ? [...members, member] : members.map((current, index) => index === editingIndex ? member : current));
    this.membersChange.emit(this.members());
    this.memberModalOpen.set(false);
    this.showToast('success', editingIndex === null ? 'Miembro añadido correctamente.' : 'Información del miembro actualizada.');
  }
  handleMemberEnter(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    this.addMember();
  }
  memberAge(member: Record<string, string>): string {
    const birth = member['member-birth']; if (!birth) return '—';
    const born = new Date(`${birth}T00:00:00`); const today = new Date();
    let age = today.getFullYear() - born.getFullYear();
    if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age--;
    return String(Math.max(0, age));
  }
  genderIcon(gender: string): string { if (gender === 'Femenino') return 'gender-female'; if (gender === 'Masculino') return 'gender-male'; if (gender === 'Prefiere no responder') return 'question-mark'; return 'gender-bigender'; }
  private validateMember(): string {
    // La lógica de validación vive en TypeScript; el HTML solo presenta su resultado.
    const member = this.memberDraft();
    for (const field of this.memberFields) {
      if (field.required && !member[field.id]?.trim()) return `Complete el campo “${field.label}”.`;
    }
    const name = member['member-name']?.trim() ?? '';
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’-]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’-]+)+$/.test(name)) return 'Ingrese al menos un nombre y un apellido válidos.';
    const documentType = member['member-document-type'] ?? '';
    const documentNumber = member['member-document']?.trim() ?? '';
    if (documentNumber) {
      const rules: Record<string, RegExp> = { CC: /^\d{6,10}$/, TI: /^\d{10,11}$/, RC: /^\d{10,11}$/, NUIP: /^\d{10}$/, CE: /^[A-Z0-9]{6,12}$/i, Pasaporte: /^[A-Z0-9]{6,12}$/i };
      if (!(rules[documentType] ?? /^[A-Z0-9]{5,15}$/i).test(documentNumber)) return 'El número de documento no cumple el formato del tipo seleccionado.';
    }
    const birthDate = member['member-birth'];
    if (birthDate) {
      if(!validBirthDate(birthDate))return 'La fecha de nacimiento no es válida o supera los 130 años.';
    }
    const freeTextFields = ['member-civil', 'member-occupation', 'member-schooling', 'member-ethnicity', 'member-disability', 'member-relation'];
    const invalidTextField = freeTextFields.find((id) => Boolean(member[id]?.trim()) && member[id].trim().length < 2);
    if (invalidTextField) return `Revise el formato del campo “${this.memberFields.find((field) => field.id === invalidTextField)?.label}”.`;
    return '';
  }
  private showToast(type: 'success' | 'error', message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ type, message });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
  placeholder(field: { label: string; type: string }): string { if (field.type === 'email') return 'nombre@correo.com'; if (field.type === 'number') return 'Ingrese un valor numérico'; if (field.type === 'time') return 'hh:mm'; return `Ingrese ${field.label.toLowerCase()}`; }
  documentError(fieldId: string): string {
    if (this.activeSection !== 1 || fieldId !== '2') return '';
    const value = (this.answers[this.fieldKey('2')] ?? '').trim();
    if (!value) return '';
    const type = this.answers[this.fieldKey('1')] ?? '';
    const rules: Record<string, { pattern: RegExp; message: string }> = {
      CC: { pattern: /^\d{6,10}$/, message: 'La cédula debe tener entre 6 y 10 dígitos.' },
      TI: { pattern: /^\d{10,11}$/, message: 'La tarjeta de identidad debe tener entre 10 y 11 dígitos.' },
      RC: { pattern: /^\d{10,11}$/, message: 'El registro civil debe tener entre 10 y 11 dígitos.' },
      NUIP: { pattern: /^\d{10}$/, message: 'El NUIP debe tener exactamente 10 dígitos.' },
      CE: { pattern: /^[A-Z0-9]{6,12}$/i, message: 'La cédula de extranjería debe tener entre 6 y 12 caracteres.' },
      Pasaporte: { pattern: /^[A-Z0-9]{6,12}$/i, message: 'El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos.' },
    };
    const rule = rules[type] ?? { pattern: /^[A-Z0-9]{5,15}$/i, message: 'Ingrese un número de documento válido.' };
    return rule.pattern.test(value) ? '' : rule.message;
  }
  documentInputMode(fieldId: string): string | null { if (this.activeSection !== 1 || fieldId !== '2') return null; const type = this.answers[this.fieldKey('1')] ?? ''; return ['CC', 'TI', 'RC', 'NUIP'].includes(type) ? 'numeric' : 'text'; }
}
