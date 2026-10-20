/** Componente raíz: conserva el estado general del formulario, calcula su progreso y coordina los componentes hijos. */
import { Component, ElementRef, ViewChild, computed, effect, signal, inject, HostListener, DestroyRef } from '@angular/core';
import { COVER_DEFINITIONS, COVER_INFO, LEGAL_REFERENCES, REPAIR_COMPONENTS, SECTION_SCHEMAS } from './form-schema';
import { EventOption, EventType } from './event-types';
import { DynamicFormComponent } from './form/dynamic-form.component';
import { FormStepperComponent } from './layout/form-stepper.component';
import { TablerIconComponent } from '@tabler/icons-angular';
import { LocalSaveStatusComponent } from './shared/local-save-status.component';
import { SummaryModalComponent } from './summary/summary-modal.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ApiFailure, FormRecord, FormRecordsService } from './dashboard/form-records.service';

import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { GUIDE_OPTIONS, GUIDE_CODES, guideCode, eventForType, validDocument, validateCapture, firstIncomplete, captureProgress, captureStats, applicable, ethnicApplies, declarantName, syncDeclarant } from './form-contract';

type SummaryTab = 'general' | 'legal' | 'reparacion' | 'definiciones';
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
  @ViewChild('profileMenu') profileMenu?: ElementRef<HTMLElement>;
  @ViewChild('profileButton') profileButton?: ElementRef<HTMLButtonElement>;
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
  closeProfileOutside(event: MouseEvent): void {
    if (!this.profileOpen() || !(event.target instanceof Node)) return;
    if (this.profileMenu?.nativeElement.contains(event.target)) return;
    if (this.profileButton?.nativeElement.contains(event.target)) return;
    this.profileOpen.set(false);
  }

  readonly currentRecord = signal<FormRecord | null>(null);
  readonly formMessage = signal('');
  readonly canSaveDraft = computed(() => validDocument(this.answers()['section-1-1'] || 'CC', this.answers()['section-1-2'] || ''));
  readonly hasPersistedRecord = computed(() => this.recordStore.records().some(record => record.id === this.currentRecord()?.id));
  readonly activeSection = signal(1);
  readonly isSummaryOpen = signal(false);
  readonly activeSummaryTab = signal<SummaryTab>('general');
  readonly story = signal('');
  readonly selectedEvent = signal<EventType>('flood');
  readonly eventMenuOpen = signal(false);
  readonly answers = signal<Record<string, string>>({});
  readonly savedLocallyAt = signal<Date | null>(null);
  // computed deriva valores de otros signals y se recalcula al cambiar sus dependencias.
  readonly characterCount = computed(() => this.story().length);
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
  readonly responseOptions = ['Sí', 'No', 'No sabe / No responde'];
  // El evento seleccionado determina dinámicamente qué preguntas se muestran.
  readonly selectedQuestions = computed(() =>
    this.eventOptions.find((event) => event.id === this.selectedEvent())?.questions ?? [],
  );
  readonly selectedEventOption = computed(() =>
    this.eventOptions.find((event) => event.id === this.selectedEvent()) ?? this.eventOptions[0],
  );
  readonly schemaFields = computed(() => this.sectionSchemas.flatMap((section, sectionIndex) =>
    section.groups.flatMap((group) => group.fields.filter(field=>!field.id.startsWith('member-') && applicable(sectionIndex+1,field.id,this.answers())).map((field) => this.fieldKey(sectionIndex + 1, field.id))),
  ));
  readonly registeredFieldCount = computed(() => captureStats(this.capture()).total);
  readonly answeredFieldCount = computed(() => captureStats(this.capture()).answered);
  private capture() {return {answers:this.answers(),story:this.story(),selectedEvent:this.selectedEvent(),members:this.members()};}
  readonly completionPercentage = computed(() => captureProgress(this.capture()));
  readonly currentSectionFieldCount = computed(() => captureStats(this.capture(),this.activeSection()).total);
  readonly currentSectionAnsweredCount = computed(() => captureStats(this.capture(),this.activeSection()).answered);
  readonly currentSectionPercentage = computed(() => captureStats(this.capture(),this.activeSection()).percentage);
  readonly currentSectionValidation = computed(() => this.validateSection(this.activeSection()));
  private validateSection(section:number) {
    const issues=validateCapture(this.capture()).filter(issue=>issue.section===section);
    const invalidAnswers=issues.filter(issue=>this.issueHasProvidedValue(issue.section,issue.field));
    return {valid:issues.length===0,issues:issues.length,questionLabels:[...new Set(invalidAnswers.map(issue=>this.issueLabel(issue.section,issue.field)))]};
  }
  private issueHasProvidedValue(section:number,field:string):boolean {
    if(field==='story')return Boolean(this.story().trim());
    if(field==='members')return this.members().length>0;
    if(Object.values(GUIDE_CODES).some(codes=>codes.includes(field)))return Boolean(this.answers()['guide-'+field]?.trim());
    return Boolean(this.answers()[this.fieldKey(section,field)]?.trim());
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
    totalAnswered: this.answeredFieldCount(), totalFields: this.registeredFieldCount(), totalPercentage: this.completionPercentage(),
    sectionAnswered: this.currentSectionAnsweredCount(), sectionFields: this.currentSectionFieldCount(), sectionPercentage: this.currentSectionPercentage(), validation: this.currentSectionValidation(),
  }));

  isSectionComplete(section:number):boolean {return this.validateSection(section).valid;}
  readonly summaryTabs: { id: SummaryTab; label: string; icon: string }[] = [
    { id: 'general', label: 'Información general', icon: 'info-circle' },
    { id: 'definiciones', label: 'Definiciones', icon: 'book-2' },
    { id: 'reparacion', label: 'Reparación integral', icon: 'users' },
    { id: 'legal', label: 'Marco normativo', icon: 'scale' },
  ];
  readonly activeSummaryLabel = computed(() =>
    this.summaryTabs.find((tab) => tab.id === this.activeSummaryTab())?.label ?? '',
  );

  constructor() {
    // La demostración solo permite el tema claro, incluida una preferencia anterior.
    document.documentElement.dataset['theme'] = 'light';
    localStorage.setItem('ruda-theme', 'light');
    // effect sincroniza el signal de la modal con clases aplicadas al documento global.

    effect(() => {
      const locked = this.isSummaryOpen();
      document.documentElement.classList.toggle('modal-scroll-locked', locked);
      document.body.classList.toggle('modal-scroll-locked', locked);
    });
  }

  setStory(value: string): void { this.story.set(value); this.scheduleLocalSave(); }
  setEvent(value: EventType): void { this.selectedEvent.set(value); this.scheduleLocalSave(); }
  chooseEvent(value: EventType): void { this.setEvent(value); this.eventMenuOpen.set(false); }
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
  fieldPlaceholder(field: { label: string; type: string }): string {
    if (field.type === 'email') return 'nombre@correo.com';
    if (field.type === 'number') return 'Ingrese un valor numérico';
    if (field.type === 'time') return 'hh:mm';
    return `Ingrese ${field.label.toLowerCase()}`;
  }
  goToSection(section: number): void {
    if (section >= 1 && section <= 6) this.activeSection.set(section);
  }
  openSummary(): void { if (this.view() !== 'form') return; this.activeSummaryTab.set('general'); this.isSummaryOpen.set(true); }
  closeSummary(): void { this.isSummaryOpen.set(false); }

  setMembers(members:Record<string,string>[]):void {this.members.set(syncDeclarant(this.answers(),members));this.scheduleLocalSave();}
  setEthnic(value:string):void {this.answers.update(a=>({...a,'section-6-applies':value}));this.scheduleLocalSave();}
  fillDemoRecord(complete:boolean):void {
    const record=this.currentRecord();
    const templates=this.recordStore.records().filter(item=>item.status==='completed'&&item.id!==record?.id);
    if(!record||!templates.length){this.formMessage.set('No hay un registro completo disponible como plantilla de demostración.');return;}
    const template=templates[Math.floor(Math.random()*templates.length)];
    const identities=[['Elena','Navarro'],['Tomás','Cárdenas'],['Mariana','Vélez'],['Samuel','Pineda'],['Carolina','Salazar'],['David','Quintero']];
    const [firstName,lastName]=identities[Math.floor(Math.random()*identities.length)];
    const document=String(Math.floor(700000000+Math.random()*200000000));
    const answers:Record<string,string>={...template.answers,
      'section-1-0':record.id,'section-1-1':'CC','section-1-2':document,'section-1-3':lastName,'section-1-4':template.answers['section-1-4']||'Pérez','section-1-5':firstName,'section-1-6':'',
      'section-1-19':this.recordStore.user()?.name||'','section-1-20':this.recordStore.user()?.document||'',
      'section-1-21':new Date().toISOString().slice(0,10),
      'section-4-53':'',
    };
    let story=template.story;
    let members=(template.members||[]).map((member,index)=>({...member,
      'member-name':index?member['member-name']:`${firstName} ${lastName}`,
      'member-document':index?member['member-document']:document,
    }));
    if(!complete){
      const protectedFields=new Set(['section-1-0','section-1-1','section-1-2','section-1-5','section-2-23','section-2-25','section-2-26','section-2-29','section-2-30']);
      for(const key of Object.keys(answers))if(!protectedFields.has(key)&&Math.random()<0.48)delete answers[key];
      delete answers['section-1-3'];
      delete answers['guide-'+(GUIDE_CODES[eventForType(answers['section-2-30']||'')]?.[0]||'')];
      story='';
      if(Math.random()<0.6)members=[];
    }
    const selected=eventForType(answers['section-2-30']||'');
    this.currentRecord.set({...record,eventId:template.eventId});
    this.answers.set(answers);this.story.set(story);this.members.set(syncDeclarant(answers,members));this.selectedEvent.set(selected);
    this.activeSection.set(firstIncomplete(this.capture()));
    this.formMessage.set(complete?'Registro completado con datos de demostración. Revíselo antes de terminarlo.':'Se llenó una parte aleatoria del registro para probar el borrador.');
    this.scheduleLocalSave();
    window.scrollTo({top:0,behavior:'smooth'});
  }
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
