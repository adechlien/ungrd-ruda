import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { SECTION_SCHEMAS } from '../../form/model/form-schema';
import { EventType } from '../../form/model/event-types';
import {
  GUIDE_OPTIONS,
  GUIDE_CODES,
  guideCode,
  eventForType,
  validDocument,
  validateCapture,
  firstIncomplete,
  captureProgress,
  captureStats,
  finishProgress,
  applicable,
  ethnicApplies,
  declarantName,
  syncDeclarant,
} from '../../form/model/form-contract';
import { FormRecord } from '../models/records';
import { ApiFailure } from '../api/api-client';
import { ATTACHMENTS_GATEWAY } from '../api/platform-gateways';
import { AuthService } from './auth.service';
import { EventsService } from './events.service';
import { FormRecordsService } from './form-records.service';

/** Estado y operaciones de una edición; su ciclo de vida pertenece al componente. */
@Injectable()
export class FormEditorService {
  private readonly recordStore = inject(FormRecordsService);
  private readonly auth = inject(AuthService);
  private readonly events = inject(EventsService);
  private readonly attachments = inject(ATTACHMENTS_GATEWAY);
  readonly members = signal<Record<string, string>[]>([]);
  readonly dirty = signal(false);
  readonly uploadingActa = signal(false);
  readonly ethnicApplies = computed(() => ethnicApplies(this.answers()));
  readonly canFinish = computed(() => validateCapture(this.capture()).length === 0);
  private revision = 0;
  private generation = 0;
  private saveQueue: Promise<boolean> = Promise.resolve(true);
  private localSaveTimer?: ReturnType<typeof setTimeout>;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.reset());
  }
  readonly currentRecord = signal<FormRecord | null>(null);
  readonly formMessage = signal('');
  readonly canSaveDraft = computed(() =>
    validDocument(this.answers()['section-1-1'] || 'CC', this.answers()['section-1-2'] || ''),
  );
  readonly activeSection = signal(1);
  readonly story = signal('');
  readonly selectedEvent = signal<EventType>('flood');
  readonly answers = signal<Record<string, string>>({});
  readonly savedLocallyAt = signal<Date | null>(null);
  readonly sectionSchemas = SECTION_SCHEMAS;
  readonly currentSchema = computed(() => {
    const section = this.activeSection();
    const schema = this.sectionSchemas[section - 1];
    if (!schema) return null;
    if (section === 6) return schema;
    return {
      ...schema,
      groups: schema.groups
        .map((group) => ({
          ...group,
          fields: group.fields.filter((field) => applicable(section, field.id, this.answers())),
        }))
        .filter((group) => group.fields.length),
    };
  });
  readonly recordSummary = computed(() => ({
    name: declarantName(this.answers()),
    document: [this.answers()['section-1-1'], this.answers()['section-1-2']]
      .filter(Boolean)
      .join(' '),
    event:
      this.events.events().find((event) => event.id === this.currentRecord()?.eventId)?.nombre ||
      this.answers()['section-2-30'] ||
      '',
  }));
  readonly sections = [
    { number: 1, title: 'Registro', enabled: true },
    { number: 2, title: 'Evento', enabled: true },
    { number: 3, title: 'Narración', enabled: true, active: true },
    { number: 4, title: 'Caracterización', enabled: true },
    { number: 5, title: 'Bienes', enabled: true },
    { number: 6, title: 'Étnico-colectivo', enabled: true },
  ];
  readonly eventOptions = GUIDE_OPTIONS;
  // El evento seleccionado determina dinámicamente qué preguntas se muestran.
  readonly selectedQuestions = computed(
    () => this.eventOptions.find((event) => event.id === this.selectedEvent())?.questions ?? [],
  );
  readonly selectedEventOption = computed(
    () =>
      this.eventOptions.find((event) => event.id === this.selectedEvent()) ?? this.eventOptions[0],
  );
  readonly totalProgress = computed(() => captureStats(this.capture()));
  private capture() {
    return {
      answers: this.answers(),
      story: this.story(),
      selectedEvent: this.selectedEvent(),
      members: this.members(),
    };
  }
  readonly completionPercentage = computed(() => captureProgress(this.capture()));
  readonly currentSectionFieldCount = computed(
    () => captureStats(this.capture(), this.activeSection()).total,
  );
  readonly currentSectionAnsweredCount = computed(
    () => captureStats(this.capture(), this.activeSection()).answered,
  );
  readonly currentSectionPercentage = computed(
    () => captureStats(this.capture(), this.activeSection()).percentage,
  );
  readonly currentSectionValidation = computed(() => this.validateSection(this.activeSection()));
  readonly finishProgress = computed(() => finishProgress(this.capture()));
  private validateSection(section: number) {
    const issues = validateCapture(this.capture()).filter((issue) => issue.section === section);
    return {
      valid: issues.length === 0,
      issues: issues.length,
      questionLabels: [
        ...new Set(issues.map((issue) => this.issueLabel(issue.section, issue.field))),
      ],
    };
  }
  private issueLabel(section: number, field: string): string {
    if (field === 'story') return 'Narración libre del declarante';
    if (field === 'members') return 'Miembros del hogar';
    for (const option of GUIDE_OPTIONS) {
      const index = (GUIDE_CODES[option.id] || []).indexOf(field);
      if (index >= 0) return option.questions[index].replace(/\s*\([^)]*\)/g, '').trim();
    }
    const schemaField = this.sectionSchemas[section - 1]?.groups
      .flatMap((group) => group.fields)
      .find((item) => item.id === field);
    return schemaField ? `${field}. ${schemaField.label}` : field;
  }
  readonly completedSections = computed(() =>
    this.sections
      .filter((section) => this.isSectionComplete(section.number))
      .map((section) => section.number),
  );
  readonly progressState = computed(() => ({
    finish: this.finishProgress(),
    totalAnswered: this.totalProgress().answered,
    totalFields: this.totalProgress().total,
    totalPercentage: this.totalProgress().percentage,
    sectionAnswered: this.currentSectionAnsweredCount(),
    sectionFields: this.currentSectionFieldCount(),
    sectionPercentage: this.currentSectionPercentage(),
    validation: this.currentSectionValidation(),
  }));

  isSectionComplete(section: number): boolean {
    return this.validateSection(section).valid;
  }

  setStory(value: string): void {
    this.story.set(value);
    this.scheduleLocalSave();
  }
  answerKey(index: number): string {
    return 'guide-' + guideCode(this.selectedEvent(), index);
  }
  setAnswer(index: number, value: string): void {
    this.answers.update((answers) => ({ ...answers, [this.answerKey(index)]: value }));
    this.scheduleLocalSave();
  }
  fieldKey(section: number, fieldId: string): string {
    return `section-${section}-${fieldId}`;
  }
  setFieldValue(section: number, fieldId: string, value: string): void {
    const previous = this.answers();
    this.answers.update((answers) => ({ ...answers, [this.fieldKey(section, fieldId)]: value }));
    if (section === 1) this.members.set(syncDeclarant(this.answers(), this.members(), previous));
    if (section === 2 && fieldId === '30') this.selectedEvent.set(eventForType(value));
    this.scheduleLocalSave();
  }
  goToSection(section: number): void {
    if (section >= 1 && section <= 6) this.activeSection.set(section);
  }

  setMembers(members: Record<string, string>[]): void {
    this.members.set(syncDeclarant(this.answers(), members));
    this.scheduleLocalSave();
  }
  setEthnic(value: string): void {
    this.answers.update((a) => ({ ...a, 'section-6-applies': value }));
    this.scheduleLocalSave();
  }

  removeRepeatedRow(change: { section: number; ids: string[] }): void {
    this.answers.update((answers) => {
      const next = { ...answers };
      for (const id of change.ids) delete next[`section-${change.section}-${id}`];
      return next;
    });
    this.scheduleLocalSave();
  }
  cancelAutosave(): void {
    clearTimeout(this.localSaveTimer);
  }
  scheduleLocalSave(): void {
    this.revision++;
    this.dirty.set(true);
    this.savedLocallyAt.set(null);
    this.cancelAutosave();
    if (this.canSaveDraft()) this.localSaveTimer = setTimeout(() => void this.flush(), 700);
  }
  flush(finish = false): Promise<boolean> {
    this.cancelAutosave();
    const generation = this.generation,
      owner = this.auth.user();
    const current = () => this.generation === generation && this.auth.user() === owner;
    this.saveQueue = this.saveQueue
      .catch(() => false)
      .then(async () => {
        if (!current()) return false;
        const record = this.currentRecord();
        if (!record) return true;
        if (!this.canSaveDraft()) return false;
        if (!this.dirty() && !finish && record.version > 0) return true;
        const revision = this.revision;
        try {
          const result = await this.recordStore.save(
            {
              ...record,
              ...this.capture(),
              activeSection: firstIncomplete(this.capture()),
              progress: this.completionPercentage(),
            },
            finish,
          );
          if (!current()) return false;
          void this.events.load(true);
          if (this.currentRecord()?.id === record.id) {
            const liveEvent = this.currentRecord()?.eventId;
            this.currentRecord.set({
              ...result,
              eventId: liveEvent !== record.eventId ? liveEvent || null : result.eventId,
            });
            if (this.revision === revision) {
              this.answers.set(result.answers);
              this.members.set(result.members);
              this.dirty.set(false);
              this.savedLocallyAt.set(new Date(result.savedAt));
            }
          }
          return true;
        } catch (error) {
          if (current()) {
            this.formMessage.set((error as Error).message);
            if (error instanceof ApiFailure && error.issues.length)
              this.activeSection.set(error.issues[0].section);
          }
          return false;
        }
      });
    return this.saveQueue;
  }
  async openRecord(record: FormRecord): Promise<boolean> {
    this.cancelAutosave();
    if (this.currentRecord() && (this.dirty() || this.recordStore.saving())) {
      if (!this.canSaveDraft()) {
        this.formMessage.set(
          'Guarde el registro abierto con una cédula o use Volver sin guardar antes de abrir otro.',
        );
        return false;
      }
      if (!(await this.flush())) return false;
      if (this.currentRecord()?.id === record.id) record = this.currentRecord()!;
    }
    this.generation++;
    this.uploadingActa.set(false);
    const originalMembers = record.members || [];
    const members = syncDeclarant(record.answers, originalMembers);
    this.currentRecord.set(record);
    this.answers.set({ ...record.answers });
    this.story.set(record.story);
    this.members.set(members);
    this.selectedEvent.set(eventForType(record.answers['section-2-30'] || ''));
    this.activeSection.set(firstIncomplete(this.capture()));
    this.dirty.set(false);
    this.revision++;
    this.savedLocallyAt.set(record.version ? new Date(record.savedAt) : null);
    this.formMessage.set('');
    if (members !== originalMembers) this.scheduleLocalSave();
    return true;
  }
  async saveCurrentDraft(): Promise<boolean> {
    this.cancelAutosave();
    if (!this.canSaveDraft()) {
      this.activeSection.set(1);
      this.formMessage.set('Ingrese una cédula válida para guardar el borrador.');
      return false;
    }
    const saved = await this.flush();
    if (saved) this.formMessage.set('');
    return saved;
  }
  async finish(): Promise<boolean> {
    this.cancelAutosave();
    const issues = validateCapture(this.capture());
    if (issues.length) {
      this.activeSection.set(issues[0].section);
      this.formMessage.set(issues[0].message);
      return false;
    }
    return this.flush(true);
  }
  reset(): void {
    this.cancelAutosave();
    this.generation++;
    this.revision++;
    this.currentRecord.set(null);
    this.answers.set({});
    this.members.set([]);
    this.story.set('');
    this.dirty.set(false);
    this.savedLocallyAt.set(null);
    this.formMessage.set('');
    this.uploadingActa.set(false);
  }
  async uploadActa(file: File): Promise<void> {
    if (file.size > 4 * 1024 * 1024) {
      this.formMessage.set('El acta debe pesar como máximo 4 MB.');
      return;
    }
    const id = this.currentRecord()?.id;
    if (!id || this.uploadingActa()) return;
    const generation = this.generation,
      owner = this.auth.user();
    const current = () =>
      this.generation === generation &&
      this.auth.user() === owner &&
      this.currentRecord()?.id === id;
    this.uploadingActa.set(true);
    try {
      if (!(await this.flush()) || !current()) return;
      const acta = await this.attachments.upload(id, file);
      if (current()) {
        this.recordStore.patchAttachment(id, acta);
        this.currentRecord.update((r) => (r ? { ...r, acta } : r));
        this.formMessage.set('Acta o comunicado guardado.');
      }
    } catch (error) {
      if (current()) this.formMessage.set((error as Error).message);
    } finally {
      if (current()) this.uploadingActa.set(false);
    }
  }
  async removeActa(): Promise<void> {
    const id = this.currentRecord()?.id;
    if (!id || this.uploadingActa()) return;
    const generation = this.generation,
      owner = this.auth.user();
    const current = () =>
      this.generation === generation &&
      this.auth.user() === owner &&
      this.currentRecord()?.id === id;
    this.uploadingActa.set(true);
    try {
      await this.attachments.remove(id);
      if (current()) {
        this.recordStore.patchAttachment(id, null);
        this.currentRecord.update((r) => (r ? { ...r, acta: null } : r));
      }
    } catch (error) {
      if (current()) this.formMessage.set((error as Error).message);
    } finally {
      if (current()) this.uploadingActa.set(false);
    }
  }
  selectSharedEvent(id: string): void {
    const event = this.events.events().find((event) => event.id === id);
    const record = this.currentRecord();
    if (!record) return;
    this.currentRecord.set({ ...record, eventId: id || null });
    if (event) {
      this.answers.update((a) => ({
        ...a,
        'section-2-30': event.tipo,
        'section-2-29': event.categoria || '',
        'section-2-25': event.departamento || '',
        'section-2-26': event.municipio || '',
        'section-2-23': event.fecha || '',
      }));
      this.selectedEvent.set(eventForType(event.tipo));
    }
    this.scheduleLocalSave();
  }
}
