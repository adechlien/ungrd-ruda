/** Componente raíz: conserva el estado general del formulario, calcula su progreso y coordina los componentes hijos. */
import { Component, ElementRef, ViewChild, computed, effect, signal, inject, HostListener, DestroyRef } from '@angular/core';
import { COVER_DEFINITIONS, COVER_INFO, LEGAL_REFERENCES, REPAIR_COMPONENTS, SECTION_SCHEMAS } from './form/model/form-schema';
import { EventType } from './form/model/event-types';
import { DynamicFormComponent } from './form/dynamic-form.component';
import { FormStepperComponent } from './layout/form-stepper.component';
import { TablerIconComponent } from '@tabler/icons-angular';
import { LocalSaveStatusComponent } from './shared/local-save-status.component';
import { SummaryModalComponent } from './summary/summary-modal.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ApiFailure, FormRecord, FormRecordsService } from './core/services/form-records.service';

import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { GUIDE_OPTIONS, GUIDE_CODES, guideCode, eventForType, validDocument, validateCapture, firstIncomplete, captureProgress, captureStats, finishProgress, applicable, ethnicApplies, declarantName, syncDeclarant } from './form/model/form-contract';

// @Component conecta la clase TypeScript con su selector, plantilla, estilos y componentes hijos.
@Component({
  selector: 'app-root',
  imports: [NgTemplateOutlet, LocalSaveStatusComponent, FormsModule, DashboardComponent, TablerIconComponent, FormStepperComponent, DynamicFormComponent, SummaryModalComponent],
  templateUrl: './app.html',
  host: { class: 'block' },
})
export class App {
  // signal guarda estado mutable y notifica a la plantilla cuando su valor cambia.
  @ViewChild('leaveDialog') leaveDialog?: ElementRef<HTMLDialogElement>;
  readonly canFinish = computed(() => validateCapture(this.capture()).length === 0);
  openLeaveDialog():void {
    clearTimeout(this.localSaveTimer);
    const record=this.currentRecord();
    if(record&&!this.dirty()&&record.version>0){
      this.view.set('dashboard');this.dashboardTab.set('forms');window.scrollTo({top:0});return;
    }
    this.leaveDialog?.nativeElement.showModal();
  }
  closeLeaveDialog():void {this.leaveDialog?.nativeElement.close();if(this.dirty())this.scheduleLocalSave();}
  async saveAndLeave():Promise<void>{
    if(!this.canSaveDraft()){this.leaveDialog?.nativeElement.close();this.activeSection.set(1);this.formMessage.set('Ingrese una cédula válida para guardar el borrador.');return;}
    await this.backToDashboard();
    if(this.view()==='dashboard')this.leaveDialog?.nativeElement.close();
  }
  loginEmail = '';
  loginPassword = '';
  readonly members = signal<Record<string,string>[]>([]);
  removeRepeatedRow(change:{section:number;ids:string[]}):void {
    this.answers.update(answers=>{const next={...answers};for(const id of change.ids)delete next[`section-${change.section}-${id}`];return next;});
    this.scheduleLocalSave();
  }
  readonly uploadingActa = signal(false);
  async uploadActa(file:File):Promise<void> {
    if(file.size>4*1024*1024){this.formMessage.set('El acta debe pesar como máximo 4 MB.');return;}
    const id=this.currentRecord()?.id;if(!id||this.uploadingActa())return;
    this.uploadingActa.set(true);
    try {
      if(!await this.saveDraftLocally() || this.currentRecord()?.id!==id)return;
      const acta=await this.recordStore.uploadActa(id,file);
      this.recordStore.records.update(records=>records.map(r=>r.id===id?{...r,acta}:r));
      if(this.currentRecord()?.id===id){this.currentRecord.update(r=>r?{...r,acta}:r);this.formMessage.set('Acta o comunicado guardado.');}
    } catch(error){this.formMessage.set((error as Error).message);}
    finally {this.uploadingActa.set(false);}
  }
  async removeActa():Promise<void> {
    const id=this.currentRecord()?.id;if(!id||this.uploadingActa())return;
    this.uploadingActa.set(true);
    try {
      await this.recordStore.deleteActa(id);
      this.recordStore.records.update(records=>records.map(r=>r.id===id?{...r,acta:null}:r));
      if(this.currentRecord()?.id===id)this.currentRecord.update(r=>r?{...r,acta:null}:r);
    } catch(error){this.formMessage.set((error as Error).message);}
    finally {this.uploadingActa.set(false);}
  }
  readonly dirty = signal(false);
  readonly ethnicApplies = computed(() => ethnicApplies(this.answers()));
  private revision = 0;
  private saveQueue: Promise<boolean> = Promise.resolve(true);
  private localSaveTimer?: ReturnType<typeof setTimeout>;
  readonly recordStore = inject(FormRecordsService);
  readonly view = signal<'dashboard' | 'form'>('dashboard');
  readonly dashboardTab = signal<'forms' | 'events' | 'stats'>('forms');
  readonly profileOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly sidebarContentVisible = signal(true);
  readonly sidebarAnimating = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  readonly navigationItems = [
    { tab: 'forms', label: 'Registros', icon: 'file-description' },
    { tab: 'events', label: 'Eventos', icon: 'calendar-event' },
    { tab: 'stats', label: 'Estadísticas', icon: 'chart-bar' },
  ] as const;
  readonly unreadNotifications = signal(true);
  readonly darkThemeActive = signal(false).asReadonly();
  readonly sessionMessage = signal('');
  readonly pendingRecords = computed(() => this.recordStore.records().filter(record => record.status === 'pending'));

  async navigateDashboard(tab: 'forms' | 'events' | 'stats'): Promise<void> {
    clearTimeout(this.localSaveTimer);
    if (this.view() === 'form' && this.canSaveDraft() && !await this.saveDraftLocally()) return;
    this.dashboardTab.set(tab);
    this.view.set('dashboard');
    this.profileOpen.set(false);
    this.notificationsOpen.set(false);
    window.scrollTo({ top: 0 });
  }
  toggleNotifications(): void {
    this.profileOpen.set(false);
    this.notificationsOpen.update(open => !open);
    if (this.notificationsOpen()) this.unreadNotifications.set(false);
  }
  toggleProfile(): void {
    this.notificationsOpen.set(false);
    this.profileOpen.update(open => !open);
  }
  async setSidebarCollapsed(collapsed: boolean): Promise<void> {
    if (this.sidebarAnimating() || collapsed === this.sidebarCollapsed()) return;
    this.profileOpen.set(false);
    this.notificationsOpen.set(false);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.sidebarCollapsed.set(collapsed);
      return;
    }
    const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    this.sidebarAnimating.set(true);
    this.sidebarContentVisible.set(false);
    // Fade out before changing the grid width and replacing the sidebar content.
    await pause(170);
    if (this.destroyRef.destroyed) return;
    this.sidebarCollapsed.set(collapsed);
    await pause(320);
    if (this.destroyRef.destroyed) return;
    this.sidebarContentVisible.set(true);
    await pause(170);
    if (!this.destroyRef.destroyed) this.sidebarAnimating.set(false);
  }
  async login(): Promise<void> { if(await this.recordStore.login(this.loginEmail,this.loginPassword)){this.loginPassword='';this.view.set('dashboard');} }
  async requestLogout(): Promise<void> {
    clearTimeout(this.localSaveTimer);
    if(this.dirty() && !this.canSaveDraft()) { this.sessionMessage.set('El registro abierto no tiene cédula. Vuelva al registro para guardarlo o use Volver sin guardar antes de cerrar sesión.'); return; }
    if(this.dirty() && !await this.saveDraftLocally())return;
    try{await this.recordStore.logout();this.currentRecord.set(null);this.answers.set({});this.members.set([]);this.view.set('dashboard');this.sessionMessage.set('');}catch(error){this.sessionMessage.set((error as Error).message);}
  }
  @HostListener('document:keydown.escape')
  closeNotifications(): void { this.notificationsOpen.set(false); this.profileOpen.set(false); }

  @HostListener('document:click', ['$event'])
  closeAccountPanelsOutside(event: MouseEvent): void {
    const path = event.composedPath();
    const insidePanel = (id: string) => path.some(node => node instanceof Element
      && (node.id === id || node.getAttribute('aria-controls') === id));
    if (this.profileOpen() && !insidePanel('workspace-profile-menu')) {
      this.profileOpen.set(false);
    }
    if (this.notificationsOpen() && !insidePanel('workspace-notifications')) {
      this.notificationsOpen.set(false);
    }
  }

  readonly currentRecord = signal<FormRecord | null>(null);
  readonly formMessage = signal('');
  readonly canSaveDraft = computed(() => validDocument(this.answers()['section-1-1'] || 'CC', this.answers()['section-1-2'] || ''));
  readonly activeSection = signal(1);
  readonly isSummaryOpen = signal(false);
  readonly story = signal('');
  readonly selectedEvent = signal<EventType>('flood');
  readonly answers = signal<Record<string, string>>({});
  readonly savedLocallyAt = signal<Date | null>(null);
  // Constantes expuestas para que la plantilla pueda pasarlas a los componentes hijos.
  readonly coverInfo = COVER_INFO;
  readonly coverDefinitions = COVER_DEFINITIONS;
  readonly repairComponents = REPAIR_COMPONENTS;
  readonly legalReferences = LEGAL_REFERENCES;
  readonly sectionSchemas = SECTION_SCHEMAS;
  readonly currentSchema = computed(() => {
    const section=this.activeSection();const schema=this.sectionSchemas[section-1];
    if(!schema)return null;
    if(section===6)return schema;
    return {...schema,groups:schema.groups.map(group=>({...group,fields:group.fields.filter(field=>applicable(section,field.id,this.answers()))})).filter(group=>group.fields.length)};
  });
  readonly recordSummary = computed(() => ({
    name: declarantName(this.answers()),
    document: [this.answers()['section-1-1'], this.answers()['section-1-2']].filter(Boolean).join(' '),
    event: this.recordStore.events().find(event=>event.id===this.currentRecord()?.eventId)?.nombre || this.answers()['section-2-30'] || '',
  }));
  readonly sections = [
    { number: 1, title: 'Declaración', enabled: true },
    { number: 2, title: 'Evento', enabled: true },
    { number: 3, title: 'Narración', enabled: true, active: true },
    { number: 4, title: 'Caracterización', enabled: true },
    { number: 5, title: 'Bienes', enabled: true },
    { number: 6, title: 'Étnico-colectivo', enabled: true },
  ];
  readonly eventOptions = GUIDE_OPTIONS;
  // El evento seleccionado determina dinámicamente qué preguntas se muestran.
  readonly selectedQuestions = computed(() =>
    this.eventOptions.find((event) => event.id === this.selectedEvent())?.questions ?? [],
  );
  readonly selectedEventOption = computed(() =>
    this.eventOptions.find((event) => event.id === this.selectedEvent()) ?? this.eventOptions[0],
  );
  readonly totalProgress = computed(() => captureStats(this.capture()));
  private capture() {return {answers:this.answers(),story:this.story(),selectedEvent:this.selectedEvent(),members:this.members()};}
  readonly completionPercentage = computed(() => captureProgress(this.capture()));
  readonly currentSectionFieldCount = computed(() => captureStats(this.capture(),this.activeSection()).total);
  readonly currentSectionAnsweredCount = computed(() => captureStats(this.capture(),this.activeSection()).answered);
  readonly currentSectionPercentage = computed(() => captureStats(this.capture(),this.activeSection()).percentage);
  readonly currentSectionValidation = computed(() => this.validateSection(this.activeSection()));
  readonly finishProgress = computed(() => finishProgress(this.capture()));
  private validateSection(section:number) {
    const issues=validateCapture(this.capture()).filter(issue=>issue.section===section);
    return {valid:issues.length===0,issues:issues.length,questionLabels:[...new Set(issues.map(issue=>this.issueLabel(issue.section,issue.field)))]};
  }
  private issueLabel(section:number,field:string):string {
    if(field==='story')return 'Narración libre del declarante';
    if(field==='members')return 'Miembros del hogar';
    for(const option of GUIDE_OPTIONS){
      const index=(GUIDE_CODES[option.id]||[]).indexOf(field);
      if(index>=0)return option.questions[index].replace(/\s*\([^)]*\)/g,'').trim();
    }
    const schemaField=this.sectionSchemas[section-1]?.groups.flatMap(group=>group.fields).find(item=>item.id===field);
    return schemaField ? `${field}. ${schemaField.label}` : field;
  }
  readonly completedSections = computed(() => this.sections.filter((section) => this.isSectionComplete(section.number)).map((section) => section.number));
  readonly progressState = computed(() => ({
    finish: this.finishProgress(),
    totalAnswered: this.totalProgress().answered, totalFields: this.totalProgress().total, totalPercentage: this.totalProgress().percentage,
    sectionAnswered: this.currentSectionAnsweredCount(), sectionFields: this.currentSectionFieldCount(), sectionPercentage: this.currentSectionPercentage(), validation: this.currentSectionValidation(),
  }));

  isSectionComplete(section:number):boolean {return this.validateSection(section).valid;}

  constructor() {
    // Aplicar el tema claro también a las preferencias de sesiones anteriores.
    document.documentElement.dataset['theme'] = 'light';
    localStorage.setItem('ruda-theme', 'light');
    // Bloquear solo la raíz evita crear en body un contenedor de scroll que desplace la sidebar sticky.

    effect((onCleanup) => {
      const locked = this.isSummaryOpen();
      document.documentElement.classList.toggle('modal-scroll-locked', locked);
      onCleanup(() => document.documentElement.classList.remove('modal-scroll-locked'));
    });
  }

  setStory(value: string): void { this.story.set(value); this.scheduleLocalSave(); }
  answerKey(index: number): string { return 'guide-' + guideCode(this.selectedEvent(),index); }
  setAnswer(index: number, value: string): void {
    this.answers.update((answers) => ({ ...answers, [this.answerKey(index)]: value }));
    this.scheduleLocalSave();
  }
  fieldKey(section: number, fieldId: string): string { return `section-${section}-${fieldId}`; }
  setFieldValue(section: number, fieldId: string, value: string): void {
    const previous=this.answers();
    this.answers.update((answers) => ({ ...answers, [this.fieldKey(section, fieldId)]: value }));
    if(section===1)this.members.set(syncDeclarant(this.answers(),this.members(),previous));
    if(section === 2 && fieldId === '30') this.selectedEvent.set(eventForType(value));
    this.scheduleLocalSave();
  }
  goToSection(section: number): void {
    if (section >= 1 && section <= 6) this.activeSection.set(section);
  }
  openSummary(): void { if (this.view() !== 'form') return; this.isSummaryOpen.set(true); }
  closeSummary(): void { this.isSummaryOpen.set(false); }

  setMembers(members:Record<string,string>[]):void {this.members.set(syncDeclarant(this.answers(),members));this.scheduleLocalSave();}
  setEthnic(value:string):void {this.answers.update(a=>({...a,'section-6-applies':value}));this.scheduleLocalSave();}

  private scheduleLocalSave():void {
    this.revision++;this.dirty.set(true);this.savedLocallyAt.set(null);
    clearTimeout(this.localSaveTimer);
    if(this.canSaveDraft())this.localSaveTimer=setTimeout(()=>void this.saveDraftLocally(),700);
  }
  private saveDraftLocally(finish=false):Promise<boolean> {
    this.saveQueue=this.saveQueue.then(async()=>{
      const record=this.currentRecord(); if(!record)return true;
      if(!this.canSaveDraft())return false;
      if(!this.dirty() && !finish && record.version>0)return true;
      const revision=this.revision;
      try{
        const result=await this.recordStore.save({...record,...this.capture(),activeSection:firstIncomplete(this.capture()),progress:this.completionPercentage()},finish);
        if(this.currentRecord()?.id===record.id){
          const liveEvent=this.currentRecord()?.eventId;
          this.currentRecord.set({...result,eventId:liveEvent!==record.eventId?liveEvent||null:result.eventId});
          if(this.revision===revision){this.answers.set(result.answers);this.members.set(result.members);this.dirty.set(false);this.savedLocallyAt.set(new Date(result.savedAt));}
        }
        return true;
      }catch(error){
        this.formMessage.set((error as Error).message);
        if(error instanceof ApiFailure && error.issues.length)this.activeSection.set(error.issues[0].section);
        return false;
      }
    });
    return this.saveQueue;
  }
  async openRecord(record:FormRecord):Promise<void> {
    clearTimeout(this.localSaveTimer);
    if(this.dirty() && this.currentRecord()?.id!==record.id){
      if(!this.canSaveDraft()){this.view.set('form');this.formMessage.set('Guarde el registro abierto con una cédula o use Volver sin guardar antes de abrir otro.');return;}
      if(!await this.saveDraftLocally())return;
    }
    const originalMembers=record.members||[];
    const members=syncDeclarant(record.answers,originalMembers);
    this.currentRecord.set(record);this.answers.set({...record.answers});this.story.set(record.story);this.members.set(members);
    this.selectedEvent.set(eventForType(record.answers['section-2-30']||''));
    this.activeSection.set(firstIncomplete(this.capture()));this.dirty.set(false);this.revision++;
    this.savedLocallyAt.set(record.version?new Date(record.savedAt):null);this.formMessage.set('');this.view.set('form');window.scrollTo({top:0});
    if(members!==originalMembers)this.scheduleLocalSave();
  }
  createRecord():void {void this.openRecord(this.recordStore.create());}
  async saveCurrentDraft():Promise<void>{
    clearTimeout(this.localSaveTimer);
    if(!this.canSaveDraft()){this.activeSection.set(1);this.formMessage.set('Ingrese una cédula válida para guardar el borrador.');return;}
    if(await this.saveDraftLocally())this.formMessage.set('');
  }
  async backToDashboard():Promise<void>{
    clearTimeout(this.localSaveTimer);
    if(!this.canSaveDraft()){this.activeSection.set(1);this.formMessage.set('Ingrese una cédula válida para guardar el borrador.');window.scrollTo({top:0});return;}
    if(await this.saveDraftLocally()){this.view.set('dashboard');this.dashboardTab.set('forms');window.scrollTo({top:0});}
  }
  leaveUnsavedForm():void {this.leaveDialog?.nativeElement.close();clearTimeout(this.localSaveTimer);this.currentRecord.set(null);this.members.set([]);this.answers.set({});this.dirty.set(false);this.view.set('dashboard');window.scrollTo({top:0});}
  async finishRecord():Promise<void>{
    clearTimeout(this.localSaveTimer);const issues=validateCapture(this.capture());
    if(issues.length){this.activeSection.set(issues[0].section);this.formMessage.set(issues[0].message);window.scrollTo({top:0,behavior:'smooth'});return;}
    if(await this.saveDraftLocally(true)){this.view.set('dashboard');this.dashboardTab.set('forms');window.scrollTo({top:0});}
  }
  selectSharedEvent(id:string):void{
    const event=this.recordStore.events().find(event=>event.id===id);const record=this.currentRecord();if(!record)return;
    this.currentRecord.set({...record,eventId:id||null});
    if(event){this.answers.update(a=>({...a,'section-2-30':event.tipo,'section-2-29':event.categoria||'','section-2-25':event.departamento||'','section-2-26':event.municipio||'','section-2-23':event.fecha||''}));this.selectedEvent.set(eventForType(event.tipo));}
    this.scheduleLocalSave();
  }
  @HostListener('window:beforeunload',['$event'])
  beforeUnload(event:BeforeUnloadEvent):void {if(this.dirty() || this.recordStore.saving()){event.preventDefault();event.returnValue='';}}
}
