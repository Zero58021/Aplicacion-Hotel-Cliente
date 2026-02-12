import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Preferences } from '@capacitor/preferences';
import { AlertController, ModalController } from '@ionic/angular';
import { ReservationInfoComponent } from '../tab4/reservation-info.component';

@Component({
  selector: 'app-tab5',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
})
export class Tab5Page implements OnInit {
 
  reservations: Reservation[] = [];
  constructor(private alertCtrl: AlertController, private modalCtrl: ModalController) { }

  ngOnInit() {
    // Cargar reservas guardadas en el dispositivo
    this.loadReservations();
  }

  // Se ejecuta cada vez que la vista/tab entra en pantalla
  async ionViewWillEnter() {
    await this.loadReservations();
  }

  async doRefresh(event?: any) {
    try {
      await this.loadReservations();
    } finally {
      if (event && event.target && typeof event.target.complete === 'function') {
        event.target.complete();
      }
    }
  }

  getNights(res: Reservation) {
    const a = new Date(res.fechaEntrada);
    const b = new Date(res.fechaSalida);
    const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  displayTotal(res: Reservation) {
    // Prefer stored total, otherwise compute from stored fields
    if (res.total && Number(res.total) > 0) return Number(res.total);
    const nights = res.nights ?? this.getNights(res);
    const roomPrice = Number(res.roomPrice || 0);
    const pensionPrice = Number(res.pensionPrice || 0);
    const habitaciones = Number(res.habitaciones || 1);
    const adults = Number(res.adults ?? res.pax ?? 0);
    const children = Number(res.children ?? 0);
    const persons = adults + children || Number(res.pax || 0) || 0;
    const n = nights || 0;
    const roomTotal = roomPrice * n * habitaciones;
    const pensionTotal = pensionPrice * persons * n;
    return Number((roomTotal + pensionTotal).toFixed(2));
  }

  // Reservas activas (no canceladas)
  get activeReservations() {
    return (this.reservations || []).filter(r => r.estado !== 'Cancelada');
  }

  // Reservas canceladas
  get cancelledReservations() {
    return (this.reservations || []).filter(r => r.estado === 'Cancelada');
  }

  private async loadReservations() {
    // Intentar cargar desde Capacitor Preferences, si falla, usar localStorage como fallback
    try {
      const ret = await Preferences.get({ key: 'reservations' });
      if (ret && ret.value) {
        this.reservations = JSON.parse(ret.value);
        return;
      }
    } catch (e) {
      console.warn('Preferences.get falló, usando localStorage como fallback', e);
    }

    try {
      const raw = localStorage.getItem('reservations');
      this.reservations = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error cargando reservas desde localStorage:', e);
      this.reservations = [];
    }
  }

  async saveReservations() {
    // Intentar guardar en Capacitor Preferences; si falla, guardar en localStorage
    try {
      await Preferences.set({ key: 'reservations', value: JSON.stringify(this.reservations) });
    } catch (e) {
      console.warn('Preferences.set falló, intentando localStorage', e);
      try {
        localStorage.setItem('reservations', JSON.stringify(this.reservations));
      } catch (e2) {
        console.error('Error guardando reservas en localStorage:', e2);
      }
    }
  }

  async clearAll() {
    this.reservations = [];
    await this.saveReservations();
  }

  async addSampleReservation() {
    const sample: Reservation = {
      id: 'R-' + Math.floor(Math.random() * 900 + 100),
      nombreCliente: 'Nuevo Cliente',
      email: '',
      telefono: '',
      fechaEntrada: new Date().toISOString().slice(0,10),
      fechaSalida: new Date(Date.now() + 1000*60*60*24).toISOString().slice(0,10),
      habitaciones: 1,
      adults: 2,
      children: 0,
      pax: 2,
      nights: 1,
      roomPrice: 0,
      pensionPrice: 0,
      total: 0,
      estado: 'Pendiente',
      notas: ''
    };
    this.reservations.unshift(sample);
    await this.saveReservations();
  }

  async deleteReservation(index: number) {
    // Confirm before deleting
    const res = this.reservations[index];
    if (!res) return;
        const alert = await this.alertCtrl.create({
          header: 'Eliminar reserva',
          message: `¿Deseas eliminar la reserva de ${res.nombreCliente} (${res.id})? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              this.reservations.splice(index, 1);
              await this.saveReservations();
            } catch (e) {
              console.error('Error eliminando reserva', e);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async cancelReservation(index: number) {
    const res = this.reservations[index];
    if (!res) return;
        const alert = await this.alertCtrl.create({
          header: 'Cancelar reserva',
          message: `¿Deseas cancelar la reserva de ${res.nombreCliente} (${res.id})?`,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          handler: async () => {
            try {
              this.reservations[index].estado = 'Cancelada';
              await this.saveReservations();
            } catch (e) {
              console.error('Error al cancelar reserva', e);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async reactivateReservation(id: string) {
    const idx = this.reservations.findIndex(r => r.id === id);
    if (idx === -1) return;
    const res = this.reservations[idx];
    const alert = await this.alertCtrl.create({
      header: 'Aceptar reserva',
      message: `¿Deseas aceptar la reserva de ${res.nombreCliente} (${res.id}) nuevamente?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: async () => {
            try {
              this.reservations[idx].estado = 'Confirmada';
              await this.saveReservations();
            } catch (e) {
              console.error('Error reactivando reserva', e);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async openInfo(res: Reservation) {
    const modal = await this.modalCtrl.create({
      component: ReservationInfoComponent,
      componentProps: {
        data: {
          criteria: {
            checkin: res.fechaEntrada,
            checkout: res.fechaSalida,
            adults: res.adults ?? res.pax,
            children: res.children ?? 0,
            rooms: res.habitaciones
          },
          selectedRoom: res.selectedRoom || { name: res.nombreCliente, price: res.roomPrice || 0 },
          selectedPension: res.selectedPension || { name: '', price: res.pensionPrice || 0, includes: [] },
          passengers: res.passengers || []
        }
      }
    });
    await modal.present();
  }

}

interface Reservation {
  id: string;
  nombreCliente: string;
  email?: string;
  telefono?: string;
  fechaEntrada: string;
  fechaSalida: string;
  habitaciones: number;
  pax: number;
  total: number;
  estado: string;
  notas?: string;
  nights?: number;
  roomPrice?: number;
  pensionPrice?: number;
  adults?: number;
  children?: number;
  selectedRoom?: any;
  selectedPension?: any;
  passengers?: any[];
}
