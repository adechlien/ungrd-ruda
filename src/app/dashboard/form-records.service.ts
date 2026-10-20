import { Injectable, signal } from '@angular/core';
import { EventType } from '../event-types';
import { Issue } from '../form-contract';
export interface FormRecord {
 acta?: ActaFile | null;
 revisionRuda: 8; versionFormato?: number;
 id: string; status: 'pending' | 'completed'; createdAt: string; savedAt: string; finishedAt?: string | null;
 activeSection: number; progress: number; story: string; selectedEvent: EventType; answers: Record<string,string>;
 members: Record<string,string>[]; eventId: string | null; version: number;
}
export interface ActaFile { nombre:string; mime:string; bytes:number; creadoEn:string; }
export interface SessionUser { id:string; funcionarioId:string; name:string; email:string; role:string; organization:string; organizationType:string; document:string; }
export interface EventRecordSummary { id:string; name:string; document:string|null; status:'pending'|'completed'; updatedAt:string; }
export interface SharedEvent { id:string; nombre:string; tipo:string; categoria:string|null; municipio:string|null; departamento:string|null; sector:string|null; direccion:string|null; fecha:string|null; hora:string|null; declarations:number; myDeclarations:number; households:number; affectedPeople:number; records:EventRecordSummary[]; }
export const EVENT_LABELS: Record<EventType,string>={flood:'Inundación / avalancha',coastal:'Erosión costera',landslide:'Deslizamiento',drought:'Sequía',evacuation:'Evacuación preventiva',fire:'Incendio forestal',other:'Otros eventos'};
export class ApiFailure extends Error { constructor(public status:number,message:string,public issues:Issue[]=[]){super(message);} }
@Injectable({providedIn:'root'})
export class FormRecordsService {
 readonly records=signal<FormRecord[]>([]);
 readonly events=signal<SharedEvent[]>([]);
 readonly user=signal<SessionUser|null>(null);
 readonly loading=signal(true);
 readonly storageError=signal('');
 readonly saving=signal(false);
 constructor(){void this.bootstrap();}
 private async request<T>(url:string,method='GET',data?:unknown):Promise<T>{
  let response:Response;
  try { response=await fetch('/api'+url,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined}); }
  catch {throw new ApiFailure(0,'No se pudo conectar con el servidor. Sus cambios siguen abiertos; vuelva a intentar guardar.');}
  if(response.status===204)return undefined as T;
  const body=await response.json().catch(()=>({message:'El servidor no está disponible.'}));
  if(!response.ok)throw new ApiFailure(response.status,body.message||'No se pudo completar la operación.',body.issues||[]);
  return body;
 }
 private normalizeEvents(events:SharedEvent[]):SharedEvent[]{
  return events.map(event=>({
   ...event,
   myDeclarations:Number(event.myDeclarations||0),households:Number(event.households||0),declarations:Number(event.declarations||0),
   affectedPeople:Number(event.affectedPeople ?? event.declarations ?? 0),records:Array.isArray(event.records)?event.records:[],
   sector:event.sector??null,direccion:event.direccion??null,hora:event.hora??null,
  }));
 }
 async bootstrap():Promise<void>{
  try{this.user.set(await this.request<SessionUser>('/auth/me'));await this.refresh();}
  catch(error){if(!(error instanceof ApiFailure && error.status===401))this.storageError.set((error as Error).message);}
  finally{this.loading.set(false);}
 }
 async login(email:string,password:string):Promise<boolean>{
  this.loading.set(true);this.storageError.set('');
  try{this.user.set(await this.request<SessionUser>('/auth/login','POST',{email,password}));await this.refresh();return true;}
  catch(error){this.storageError.set((error as Error).message);return false;}
  finally{this.loading.set(false);}
 }
 async logout():Promise<void>{await this.request('/auth/logout','POST');this.user.set(null);this.records.set([]);this.events.set([]);this.storageError.set('');}
 async refresh():Promise<void>{
  const [records,events]=await Promise.all([this.request<FormRecord[]>('/forms'),this.request<SharedEvent[]>('/events')]);this.records.set(records);this.events.set(this.normalizeEvents(events));this.storageError.set('');
 }
 async refreshEvents():Promise<void>{try{this.events.set(this.normalizeEvents(await this.request<SharedEvent[]>('/events')));}catch{/* Las declaraciones ya guardadas permanecen disponibles. */}}
 async uploadActa(id:string,file:File):Promise<ActaFile>{
  const response=await fetch('/api/forms/'+id+'/acta?nombre='+encodeURIComponent(file.name),{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream'},body:file});
  const body=await response.json();
  if(!response.ok)throw new ApiFailure(response.status,body.message||'No se pudo guardar el acta.');
  return body;
 }
 async deleteActa(id:string):Promise<void>{await this.request('/forms/'+id+'/acta','DELETE');}
 async save(record:FormRecord,finish=false):Promise<FormRecord>{
  this.saving.set(true);this.storageError.set('');
  try{
   const saved=await this.request<FormRecord>('/forms/'+record.id+(finish?'/finish':''),finish?'POST':'PUT',record);
   this.records.update(items=>[saved,...items.filter(item=>item.id!==saved.id)]);
   void this.refreshEvents();return saved;
  }catch(error){this.storageError.set((error as Error).message);throw error;}
  finally{this.saving.set(false);}
 }
 create():FormRecord{
  const now=new Date().toISOString();const id=crypto.randomUUID();const user=this.user();
  return {revisionRuda:8,id,status:'pending',createdAt:now,savedAt:now,activeSection:1,progress:0,story:'',selectedEvent:'other',members:[],eventId:null,version:0,
   answers:{'section-1-0':id,'section-1-19':user?.name||'','section-1-20':user?.document||'','section-1-17':user?.organizationType||'UNGRD','section-6-applies':'No'}};
 }
}
