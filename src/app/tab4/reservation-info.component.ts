import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [IonicModule, CommonModule],
  selector: 'app-reservation-info',
  template: `
    <ion-content class="bg-light ion-padding">
      
      <div class="ticket-container">
        
        <div class="ticket-header">
          <ion-icon name="bed-outline"></ion-icon>
          <h2>Boleto de Reserva</h2>
          <p>Resumen de tu información</p>
        </div>

        <div class="status-banner" *ngIf="data?.estado" [ngClass]="data?.estado.toLowerCase() || 'pendiente'">
          <ion-icon [name]="getStatusIcon(data?.estado)"></ion-icon>
          <span>Estado: <strong>{{ data?.estado }}</strong></span>
        </div>

        <div class="ticket-section">
          <div class="section-title">
            <ion-icon name="calendar-outline"></ion-icon> Estancia
          </div>
          <div class="grid-2">
            <div class="data-block">
              <span class="label">Fecha Entrada</span>
              <span class="value">{{ fmtDate(data?.criteria?.checkin) }}</span>
            </div>
            <div class="data-block">
              <span class="label">Fecha Salida</span>
              <span class="value">{{ fmtDate(data?.criteria?.checkout) }}</span>
            </div>
            <div class="data-block">
              <span class="label">Huéspedes</span>
              <span class="value">{{ data?.criteria?.adults ?? 0 }} Ad, {{ data?.criteria?.children ?? 0 }} Ni</span>
            </div>
            <div class="data-block">
              <span class="label">Total Habitaciones</span>
              <span class="value">{{ data?.criteria?.rooms ?? 1 }}</span>
            </div>
            
            <div class="data-block full-width" *ngIf="data?.criteria">
              <span class="label">Mascotas</span>
              <span class="value" [class.text-success]="data?.criteria?.pets">
                <ion-icon [name]="data?.criteria?.pets ? 'paw' : 'close-circle-outline'"></ion-icon> 
                {{ data?.criteria?.pets ? 'Sí, viaja con mascota' : 'No lleva mascota' }}
              </span>
            </div>
          </div>
        </div>

        <div class="ticket-section" *ngIf="data?.alergiasGenerales" style="padding-top: 0;">
           <div class="status-banner denegada" style="border-radius: 8px; justify-content: flex-start; margin-top: 10px;">
             <ion-icon name="warning-outline"></ion-icon>
             <span><strong>Alergias/Notas registradas:</strong> {{ data.alergiasGenerales }}</span>
           </div>
        </div>

        <div class="ticket-divider dashed"></div>

        <div class="ticket-section">
          <div class="section-title">
            <ion-icon name="key-outline"></ion-icon> Alojamiento ({{ data?.selectedCart?.totalRooms || 0 }})
          </div>
          
          <ng-container *ngIf="data?.selectedCart?.selectedCategories?.length; else fallbackRooms">
            <div class="cart-item" *ngFor="let room of data.selectedCart.selectedCategories">
              <div class="info-row">
                <span class="info-label">
                  <span class="qty-badge-inline">{{ room.qty || 1 }}x</span> Habitación
                </span>
                <span class="info-val fw-bold">{{ room.name || 'Alojamiento' }}</span>
              </div>
              <div class="info-row" *ngIf="room.type">
                <span class="info-label">Tipo</span>
                <span class="info-val">{{ room.type }}</span>
              </div>
              <div class="info-row" *ngIf="room.amenities && room.amenities.length">
                <span class="info-label">Extras</span>
                <span class="info-val text-muted">{{ room.amenities.join(', ') }}</span>
              </div>
            </div>
          </ng-container>
          
          <ng-template #fallbackRooms>
            <div class="cart-item">
              <div class="info-row">
                <span class="info-label">
                  <span class="qty-badge-inline">{{ data?.criteria?.rooms || 1 }}x</span> Habitación
                </span>
                <span class="info-val fw-bold">Habitación Estándar</span>
              </div>
            </div>
          </ng-template>
        </div>

        <div class="ticket-divider dashed"></div>

        <div class="ticket-section">
          <div class="section-title">
            <ion-icon name="restaurant-outline"></ion-icon> Régimen
          </div>
          <div class="info-row">
            <span class="info-label">Pensión</span>
            <span class="info-val fw-bold">{{ data?.selectedPension?.name ?? 'Solo alojamiento' }}</span>
          </div>
          <div class="info-row" *ngIf="data?.selectedPension?.includes?.length">
            <span class="info-label">Incluye</span>
            <span class="info-val">{{ data.selectedPension.includes.join(' • ') }}</span>
          </div>
        </div>

        <div class="ticket-divider dashed"></div>

        <div class="ticket-section pb-0">
          <div class="section-title">
            <ion-icon name="people-outline"></ion-icon> Ocupantes ({{ passengersList.length }})
          </div>

          <div *ngIf="passengersList.length > 0; else none">
            <div class="passenger-card" *ngFor="let p of passengersList" [class.is-primary]="p.isPrimary">
              <div class="p-header">
                <ion-icon [name]="p.isPrimary ? 'star' : 'person'"></ion-icon>
                <strong>{{ p.name || 'Falta nombre' }} {{ p.lastName || '' }}</strong>
                <ion-badge color="primary" *ngIf="p.isPrimary" mode="ios">TITULAR</ion-badge>
                <ion-badge color="medium" *ngIf="!p.isPrimary" mode="ios">{{ p.type === 'adult' ? 'Adulto' : 'Niño' }}</ion-badge>
              </div>
              <div class="p-body">
                <div class="p-row"><span>DNI:</span> {{ p.dni || 'No indicado' }}</div>
                <div class="p-row" *ngIf="p.phone"><span>Tel:</span> {{ p.phone }}</div>
                <div class="p-row" *ngIf="p.email"><span>Email:</span> {{ p.email }}</div>
                <div class="p-row text-danger" *ngIf="p.allergies && p.allergies.toLowerCase() !== 'ninguna'">
                  <span>Alergias (Pasajero):</span> <strong>{{ p.allergies }}</strong>
                </div>
              </div>
            </div>
          </div>
          <ng-template #none>
            <div class="empty-passengers">No hay datos de huéspedes registrados detalladamente.</div>
          </ng-template>
        </div>

        <div class="ticket-footer" *ngIf="data?.total">
           <div class="total-row">
              <span>IMPORTE TOTAL</span>
              <span class="total-price">{{ formatCurrency(data?.total) }}</span>
           </div>
        </div>

      </div>

      <div class="button-container">
        <ion-button expand="block" shape="round" color="dark" (click)="close()" class="close-btn">
          CERRAR RESUMEN
        </ion-button>
      </div>
      
    </ion-content>
  `,
  styles: [`
    :host {
      --ion-background-color: #f4f5f8;
    }
    .bg-light {
      --background: #f4f5f8;
    }

    .ticket-container {
      background: #ffffff;
      border-radius: 16px;
      margin: 10px 0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      overflow: hidden;
      position: relative;
    }

    .ticket-header {
      background: linear-gradient(135deg, var(--ion-color-primary), #11823b);
      color: white;
      padding: 24px 20px;
      text-align: center;
    }
    .ticket-header ion-icon {
      font-size: 2.8rem;
      margin-bottom: 8px;
      color: #fff;
    }
    .ticket-header h2 { margin: 0; font-weight: 800; font-size: 1.4rem; letter-spacing: 0.5px;}
    .ticket-header p { margin: 4px 0 0; font-size: 0.9rem; opacity: 0.9; }

    .status-banner {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px; font-size: 0.95rem; color: #fff;
    }
    .status-banner.pendiente { background: #f59e0b; }
    .status-banner.confirmada { background: var(--ion-color-success, #10b981); }
    .status-banner.denegada { background: var(--ion-color-danger, #ef4444); }
    .status-banner.cancelada { background: #94a3b8; }

    .ticket-divider.dashed {
      height: 1px;
      background: transparent;
      border-top: 2px dashed #ddd;
      margin: 0 20px;
      position: relative;
    }
    .ticket-divider.dashed::before, .ticket-divider.dashed::after {
      content: '';
      position: absolute;
      top: -10px;
      width: 20px;
      height: 20px;
      background: #f4f5f8;
      border-radius: 50%;
    }
    .ticket-divider.dashed::before { left: -30px; box-shadow: inset -2px 0 4px rgba(0,0,0,0.03); }
    .ticket-divider.dashed::after { right: -30px; box-shadow: inset 2px 0 4px rgba(0,0,0,0.03); }

    .ticket-section { padding: 20px; }
    .pb-0 { padding-bottom: 20px; }

    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 1.1rem; font-weight: 800; color: #222; margin-bottom: 16px;
    }
    .section-title ion-icon { color: var(--ion-color-primary); font-size: 1.4rem; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .data-block { display: flex; flex-direction: column; }
    .data-block.full-width { grid-column: 1 / -1; margin-top: 4px; }
    .data-block .label { font-size: 0.75rem; color: #888; margin-bottom: 4px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;}
    .data-block .value { font-size: 0.95rem; font-weight: 700; color: #111; display:flex; align-items:center; gap: 4px; }
    .text-success { color: var(--ion-color-success) !important; }

    .cart-item {
      background: #fafafa; border-radius: 12px; padding: 12px; margin-bottom: 12px; border: 1px solid #eee;
    }
    .cart-item:last-child { margin-bottom: 0; }
    .qty-badge-inline {
      background: var(--ion-color-primary); color: white; font-size: 0.75rem; font-weight: 800;
      padding: 2px 6px; border-radius: 6px; margin-right: 4px;
    }

    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.95rem; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #666; font-weight: 500; display: flex; align-items: center;}
    .info-val { color: #222; text-align: right; max-width: 65%; }
    .fw-bold { font-weight: 700; font-size: 1.05rem; }
    .text-muted { color: #888; font-size: 0.85rem; line-height: 1.3;}

    .passenger-card {
      background: #fafafa; border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px;
    }
    .passenger-card:last-child { margin-bottom: 0; }
    .passenger-card.is-primary { background: rgba(var(--ion-color-primary-rgb), 0.05); border: 1.5px solid rgba(var(--ion-color-primary-rgb), 0.3); }
    .p-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; border-bottom: 1px solid #eaeaea; padding-bottom: 8px; }
    .p-header ion-icon { color: var(--ion-color-primary); font-size: 1.2rem; }
    .p-header strong { font-size: 0.95rem; color: #222; flex: 1; }
    .p-body { font-size: 0.85rem; color: #555; display:flex; flex-direction:column; gap: 6px; }
    .p-row span { font-weight: 700; color: #333; width: 60px; display: inline-block; }
    .text-danger { color: var(--ion-color-danger); background: rgba(var(--ion-color-danger-rgb), 0.1); padding: 6px 8px; border-radius: 6px; margin-top: 2px;}

    .empty-passengers { color: #888; font-style: italic; text-align: center; padding: 10px; }

    .ticket-footer { background: #f8fafc; padding: 20px; border-top: 2px dashed #ddd; }
    .total-row { display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 1.2rem; color: #1e293b; }
    .total-price { color: var(--ion-color-primary); font-size: 1.4rem; }

    .button-container { margin-top: 24px; margin-bottom: 30px; }
    .close-btn { font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  `]
})
export class ReservationInfoComponent {
  @Input() data: any;

  constructor(private modalCtrl: ModalController) {}

  get passengersList() {
    if (!this.data?.passengers) return [];
    return [...this.data.passengers].sort((a, b) => {
      if (a.isPrimary === b.isPrimary) return 0;
      return a.isPrimary ? -1 : 1;
    });
  }

  fmtDate(d: any) {
    try { return d ? new Date(d).toLocaleDateString() : '-'; } catch { return '-'; }
  }

  formatCurrency(val: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(val) || 0);
  }

  getStatusIcon(status: string): string {
    const s = String(status || '').toLowerCase();
    if (s.includes('confirmada')) return 'checkmark-circle';
    if (s.includes('cancelada')) return 'ban';
    if (s.includes('denegada')) return 'close-circle';
    return 'time';
  }

  close() { this.modalCtrl.dismiss(); }
}