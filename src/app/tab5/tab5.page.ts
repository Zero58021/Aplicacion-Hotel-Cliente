import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ModalController, PopoverController } from '@ionic/angular';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api'; // Asegúrate que la ruta es correcta
import { AuthService } from '../services/auth.service';
import { ReservationInfoComponent } from '../tab4/reservation-info.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal.component';

@Component({
  selector: 'app-tab5',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DatePipe, CurrencyPipe, RouterModule],
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
})
export class Tab5Page implements OnInit {
  
  reservations: any[] = [];
  currentUser: any = null;

  constructor(
    private alertCtrl: AlertController, 
    private modalCtrl: ModalController,
    private popoverCtrl: PopoverController,
    private apiService: ApiService,
    public auth: AuthService
  ) { }

  async openUserMenu(ev: Event) {
    const pop = await this.popoverCtrl.create({
      component: UserMenuComponent,
      event: ev,
      translucent: true,
    });
    await pop.present();
    const { data } = await pop.onDidDismiss();
    if (data && data.action === 'edit') {
      const modal = await this.modalCtrl.create({
        component: UserProfileModalComponent,
        cssClass: 'user-profile-modal'
      });
      await modal.present();
    }
  }

  ngOnInit() {
    this.currentUser = this.auth.getUser();
    this.loadReservations();
  }

  async ionViewWillEnter() {
    this.currentUser = this.auth.getUser();
    await this.loadReservations();
  }

  async doRefresh(event?: any) {
    await this.loadReservations();
    if (event && event.target) {
      event.target.complete();
    }
  }

  private async loadReservations() {
    this.currentUser = this.auth.getUser();

    if (!this.currentUser || !this.currentUser.email) return;

    // USAMOS EL NUEVO MÉTODO FILTRADO POR FECHA
    this.apiService.getReservasActivasCliente(this.currentUser.email).subscribe({
      next: (data: any[]) => {
        // Ordenamos: Las más próximas primero (fechaEntrada ascendente)
        this.reservations = data.sort((a, b) => {
          return new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime();
        });
      },
      error: (err: any) => console.error('Error cargando reservas:', err)
    });
  }

  displayTotal(res: any): number {
    if (res.total && Number(res.total) > 0) return Number(res.total);
    const nights = res.nights || 1;
    const roomPrice = Number(res.roomPrice || 0);
    const pensionPrice = Number(res.pensionPrice || 0);
    const persons = Number(res.adults || 0) + Number(res.children || 0);
    return Number(((roomPrice * nights) + (pensionPrice * persons * nights)).toFixed(2));
  }

  async openInfo(res: any) {
    const modal = await this.modalCtrl.create({
      component: ReservationInfoComponent,
      componentProps: {
        data: {
          criteria: {
            checkin: res.fechaEntrada,
            checkout: res.fechaSalida,
            adults: res.adults || res.pax,
            children: res.children || 0,
            rooms: res.habitaciones || 1
          },
          selectedRoom: res.selectedRoom || { name: 'Estándar', price: res.roomPrice || 0 },
          selectedPension: res.selectedPension || { name: 'Sin Pensión', price: res.pensionPrice || 0, includes: [] },
          passengers: res.passengers || []
        }
      }
    });
    await modal.present();
  }

  async cancelReservation(res: any) {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar reserva',
      message: `¿Estás seguro de que deseas cancelar tu estancia?`,
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

  formatCurrency(val: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  }
}