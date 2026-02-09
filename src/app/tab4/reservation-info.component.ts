import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [IonicModule, CommonModule],
  selector: 'app-reservation-info',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Información reserva</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h3>Datos de la reserva</h3>
      <p>Entrada: {{ fmtDate(data?.criteria?.checkin) }} — Salida: {{ fmtDate(data?.criteria?.checkout) }}</p>
      <p>Adultos: {{ data?.criteria?.adults ?? '-' }} · Niños: {{ data?.criteria?.children ?? '-' }} · Habitaciones: {{ data?.criteria?.rooms ?? '-' }}</p>

      <h3>Habitación escogida</h3>
      <p>Nombre: {{ data?.selectedRoom?.name ?? '-' }}</p>
      <p>Tipo: {{ data?.selectedRoom?.type ?? '-' }} · Planta: {{ data?.selectedRoom?.floor ?? '-' }}</p>
      <p>Precio por noche: {{ data?.selectedRoom?.price ?? '-' }} €</p>
      <p>Extras: {{ data?.selectedRoom?.amenities?.length ? (data.selectedRoom.amenities.join(', ')) : 'Sin extras' }}</p>

      <h3>Pensión escogida</h3>
      <p>Nombre: {{ data?.selectedPension?.name ?? '-' }}</p>
      <p>Incluye: {{ data?.selectedPension?.includes?.length ? (data.selectedPension.includes.join(', ')) : '-' }}</p>
      <p>Precio por persona/día: {{ data?.selectedPension?.price ?? '-' }} €</p>

      <h3>Pasajeros</h3>
      <div *ngIf="data?.passengers && data.passengers.length; else none">
        <ion-list>
          <ion-item *ngFor="let p of data.passengers">
            <ion-label>
              <h3>{{ p.name || '-' }} {{ p.lastName || '' }} <small *ngIf="p.isPrimary">(Titular)</small></h3>
              <p>DNI: {{ p.dni || '—' }} · Tel: {{ p.phone || '—' }} · Email: {{ p.email || '—' }}</p>
              <p *ngIf="p.allergies">Alergias: {{ p.allergies }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
      <ng-template #none>
        <p>No hay pasajeros definidos.</p>
      </ng-template>
    </ion-content>
  `
})
export class ReservationInfoComponent {
  @Input() data: any;

  constructor(private modalCtrl: ModalController) {}

  fmtDate(d: any) {
    try { return d ? new Date(d).toLocaleDateString() : '-'; } catch { return '-'; }
  }

  close() { this.modalCtrl.dismiss(); }
}
