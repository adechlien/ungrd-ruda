/** Navegador de pasos: recibe el estado de las secciones y notifica al padre cuando el usuario cambia de paso. */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormSection } from '../event-types';

@Component({ selector: 'app-form-stepper', templateUrl: './form-stepper.component.html' })
export class FormStepperComponent {
  // El padre posee el estado; este hijo solo lo recibe y solicita cambios con EventEmitter.
  @Input() sections: FormSection[] = [];
  @Input() activeSection = 1;
  @Input() completedSections: number[] = [];
  @Output() sectionChange = new EventEmitter<number>();
  isComplete(section: number): boolean { return this.completedSections.includes(section); }
}
