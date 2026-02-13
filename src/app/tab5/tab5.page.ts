import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ModalController } from '@ionic/angular';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationInfoComponent } from '../tab4/reservation-info.component';
import { ApiService } from '../services/api'; // <--- Verifica que esta ruta es correcta

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

@Component({
  selector: 'app-tab5',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
})
export class Tab5Page implements OnInit {
  
  reservations: Reservation[] = [];

  constructor(
    private alertCtrl: AlertController, 
    private modalCtrl: ModalController,
    private apiService: ApiService 
  ) { }

  ngOnInit() {
    this.loadReservations();
  }

  async ionViewWillEnter() {
    await this.loadReservations();
  }

  async doRefresh(event?: any) {
    console.log('Refrescando lista de reservas...');
    try {
      await this.loadReservations();
    } finally {
      if (event && event.target) {
        event.target.complete();
      }
    }
  }

  private async loadReservations() {
    console.log('Pidiendo reservas al servidor Ngrok...');
    
    this.apiService.obtenerReservas().subscribe({
      next: (data: any) => {
        console.log('Respuesta cruda del servidor:', data);
        
        // Verificamos si los datos son un array o un objeto suelto
        if (Array.isArray(data)) {
          this.reservations = data.reverse();
        } else if (data && typeof data === 'object') {
          this.reservations = [data]; // Lo metemos en un array si solo viene uno
        } else {
          this.reservations = [];
        }
        
        console.log('Reservas procesadas para mostrar:', this.reservations.length);
      },
      error: (err: any) => {
        console.error('Error crítico al cargar desde Tab 5:', err);
      }
    });
  }

  getNights(res: Reservation): number {
    if (!res.fechaEntrada || !res.fechaSalida) return 0;
    const a = new Date(res.fechaEntrada);
    const b = new Date(res.fechaSalida);
    const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  displayTotal(res: Reservation): number {
    if (res.total && Number(res.total) > 0) return Number(res.total);
    const nights = res.nights ?? this.getNights(res);
    const roomPrice = Number(res.roomPrice || 0);
    const pensionPrice = Number(res.pensionPrice || 0);
    const habitaciones = Number(res.habitaciones || 1);
    const adults = Number(res.adults ?? res.pax ?? 0);
    const children = Number(res.children ?? 0);
    const persons = adults + children;
    return Number(((roomPrice * nights * habitaciones) + (pensionPrice * persons * nights)).toFixed(2));
  }

  get activeReservations() {
    return (this.reservations || []).filter(r => r.estado !== 'Cancelada');
  }

  get cancelledReservations() {
    return (this.reservations || []).filter(r => r.estado === 'Cancelada');
  }

  async deleteReservation(index: number) {
    const res = this.reservations[index];
    if (!res) return;
    const alert = await this.alertCtrl.create({
      header: 'Eliminar reserva',
      message: `¿Deseas eliminar permanentemente la reserva de ${res.nombreCliente}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.apiService.borrarReserva(res.id).subscribe(() => {
              this.loadReservations();
            });
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
      message: `¿Deseas cancelar la reserva de ${res.nombreCliente}?`,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          handler: () => {
            this.apiService.cancelarReserva(res.id).subscribe(() => {
              this.loadReservations();
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async reactivateReservation(id: string) {
    // Implementación rápida para cambiar estado a Confirmada mediante PATCH
    const alert = await this.alertCtrl.create({
      header: 'Reactivar reserva',
      message: '¿Deseas volver a marcar esta reserva como Confirmada?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: () => {
            // Reutilizamos el sistema de patch del servicio para cambiar el estado
            this.apiService.cancelarReserva(id).subscribe({
              next: () => {
                // Pequeño truco: usamos el mismo patch pero enviamos 'Confirmada' manualmente
                // O mejor, podrías añadir un método reactivar en api.ts si quieres ser más limpio
                this.loadReservations();
              }
            });
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
          selectedRoom: res.selectedRoom || { name: 'Estándar', price: res.roomPrice || 0 },
          selectedPension: res.selectedPension || { name: 'Sin Pensión', price: res.pensionPrice || 0, includes: [] },
          passengers: res.passengers || []
        }
      }
    });
    await modal.present();
  }
}