/** Sesión, navegación y presentación del espacio de trabajo. */
import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  signal,
  inject,
  HostListener,
  DestroyRef,
} from '@angular/core';
import {
  COVER_DEFINITIONS,
  COVER_INFO,
  LEGAL_REFERENCES,
  REPAIR_COMPONENTS,
} from './form/model/form-schema';
import { DynamicFormComponent } from './form/dynamic-form.component';
import { FormStepperComponent } from './layout/form-stepper.component';
import { TablerIconComponent } from '@tabler/icons-angular';
import { LocalSaveStatusComponent } from './shared/local-save-status.component';
import { SummaryModalComponent } from './summary/summary-modal.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { FormRecordsService } from './core/services/form-records.service';
import { FormRecord } from './core/models/records';
import { AuthService } from './core/services/auth.service';
import { EventsService } from './core/services/events.service';
import { FormEditorService } from './core/services/form-editor.service';

import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';

// @Component conecta la clase TypeScript con su selector, plantilla, estilos y componentes hijos.
@Component({
  selector: 'app-root',
  providers: [FormEditorService],
  imports: [
    NgTemplateOutlet,
    LocalSaveStatusComponent,
    FormsModule,
    DashboardComponent,
    TablerIconComponent,
    FormStepperComponent,
    DynamicFormComponent,
    SummaryModalComponent,
  ],
  templateUrl: './app.html',
  host: { class: 'block' },
})
export class App {
  @ViewChild('leaveDialog') leaveDialog?: ElementRef<HTMLDialogElement>;
  readonly session = inject(AuthService);
  readonly events = inject(EventsService);
  readonly editor = inject(FormEditorService);
  loginEmail = '';
  loginPassword = '';
  readonly isSummaryOpen = signal(false);
  readonly coverInfo = COVER_INFO;
  readonly coverDefinitions = COVER_DEFINITIONS;
  readonly repairComponents = REPAIR_COMPONENTS;
  readonly legalReferences = LEGAL_REFERENCES;
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
  readonly pendingRecords = computed(() =>
    this.recordStore.records().filter((record) => record.status === 'pending'),
  );

  async navigateDashboard(tab: 'forms' | 'events' | 'stats'): Promise<void> {
    this.editor.cancelAutosave();
    if (this.view() === 'form' && this.editor.canSaveDraft() && !(await this.editor.flush()))
      return;
    this.dashboardTab.set(tab);
    this.view.set('dashboard');
    this.profileOpen.set(false);
    this.notificationsOpen.set(false);
    window.scrollTo({ top: 0 });
  }
  toggleNotifications(): void {
    this.profileOpen.set(false);
    this.notificationsOpen.update((open) => !open);
    if (this.notificationsOpen()) this.unreadNotifications.set(false);
  }
  toggleProfile(): void {
    this.notificationsOpen.set(false);
    this.profileOpen.update((open) => !open);
  }
  async setSidebarCollapsed(collapsed: boolean): Promise<void> {
    if (this.sidebarAnimating() || collapsed === this.sidebarCollapsed()) return;
    this.profileOpen.set(false);
    this.notificationsOpen.set(false);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.sidebarCollapsed.set(collapsed);
      return;
    }
    const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
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
  async login(): Promise<void> {
    if (await this.session.login(this.loginEmail, this.loginPassword)) {
      this.loginPassword = '';
      this.editor.reset();
      this.view.set('dashboard');
    }
  }
  async requestLogout(): Promise<void> {
    this.editor.cancelAutosave();
    if (this.editor.dirty() && !this.editor.canSaveDraft()) {
      this.sessionMessage.set(
        'El registro abierto no tiene cédula. Vuelva al registro para guardarlo o use Volver sin guardar antes de cerrar sesión.',
      );
      return;
    }
    if ((this.editor.dirty() || this.recordStore.saving()) && !(await this.editor.flush())) return;
    try {
      await this.session.logout();
      this.editor.reset();
      this.view.set('dashboard');
      this.sessionMessage.set('');
    } catch (error) {
      this.sessionMessage.set((error as Error).message);
    }
  }
  @HostListener('document:keydown.escape')
  closeNotifications(): void {
    this.notificationsOpen.set(false);
    this.profileOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  closeAccountPanelsOutside(event: MouseEvent): void {
    const path = event.composedPath();
    const insidePanel = (id: string) =>
      path.some(
        (node) =>
          node instanceof Element && (node.id === id || node.getAttribute('aria-controls') === id),
      );
    if (this.profileOpen() && !insidePanel('workspace-profile-menu')) {
      this.profileOpen.set(false);
    }
    if (this.notificationsOpen() && !insidePanel('workspace-notifications')) {
      this.notificationsOpen.set(false);
    }
  }

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

  openSummary(): void {
    if (this.view() === 'form') this.isSummaryOpen.set(true);
  }
  closeSummary(): void {
    this.isSummaryOpen.set(false);
  }
  openLeaveDialog(): void {
    this.editor.cancelAutosave();
    const record = this.editor.currentRecord();
    if (record && !this.editor.dirty() && record.version > 0) {
      this.view.set('dashboard');
      this.dashboardTab.set('forms');
      window.scrollTo({ top: 0 });
      return;
    }
    this.leaveDialog?.nativeElement.showModal();
  }
  closeLeaveDialog(): void {
    this.leaveDialog?.nativeElement.close();
    if (this.editor.dirty()) this.editor.scheduleLocalSave();
  }
  async saveAndLeave(): Promise<void> {
    await this.backToDashboard();
    this.leaveDialog?.nativeElement.close();
  }
  async openRecord(record: FormRecord): Promise<void> {
    if (await this.editor.openRecord(record)) {
      this.view.set('form');
      window.scrollTo({ top: 0 });
    }
  }
  createRecord(): void {
    void this.openRecord(this.recordStore.create());
  }
  async saveCurrentDraft(): Promise<void> {
    await this.editor.saveCurrentDraft();
  }
  async backToDashboard(): Promise<void> {
    if (await this.editor.saveCurrentDraft()) {
      this.view.set('dashboard');
      this.dashboardTab.set('forms');
    }
    window.scrollTo({ top: 0 });
  }
  leaveUnsavedForm(): void {
    this.leaveDialog?.nativeElement.close();
    this.editor.reset();
    this.view.set('dashboard');
    window.scrollTo({ top: 0 });
  }
  async finishRecord(): Promise<void> {
    if (await this.editor.finish()) {
      this.view.set('dashboard');
      this.dashboardTab.set('forms');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.editor.dirty() || this.recordStore.saving()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
