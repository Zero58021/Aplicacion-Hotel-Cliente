import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ModalController, PopoverController, LoadingController } from '@ionic/angular';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api'; 
import { AuthService } from '../services/auth.service';
import { ReservationInfoComponent } from '../tab4/reservation-info.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal.component';

// Importaciones para generar PDF
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Magia nativa para móviles
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

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
    private loadingCtrl: LoadingController,
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

    this.apiService.getReservasActivasCliente(this.currentUser.email).subscribe({
      next: (data: any[]) => {
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

  // Helper para generar el título principal de la tarjeta
  getRoomTitle(res: any): string {
    if (res.selectedCategories && res.selectedCategories.length > 0) {
      const first = res.selectedCategories[0];
      const count = res.selectedCategories.reduce((sum: number, c: any) => sum + (c.qty || 1), 0);
      return count > 1 ? `${first.name} (+${count - 1} más)` : first.name;
    }
    return res.selectedRoom?.name || 'Reserva de Alojamiento';
  }

  async openInfo(res: any) {
    // Adaptamos los datos para usar el mismo componente Modal que ya arreglamos antes
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
          selectedCart: {
            selectedCategories: res.selectedCategories || [],
            totalRooms: res.habitaciones || 1
          },
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

  // ==========================================
  // GENERACIÓN DE PDF MEJORADA (Múltiples habitaciones)
  // ==========================================
  async downloadPDF(res: any) {
    const loading = await this.loadingCtrl.create({
      message: 'Generando PDF...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const element = document.createElement('div');
      element.id = 'pdf-container';
      element.style.position = 'absolute';
      element.style.top = '-9999px';
      element.style.left = '-9999px';
      element.style.width = '800px'; 
      element.style.background = '#f4f5f8';
      element.style.padding = '40px';
      
      const titular = res.passengers?.find((p:any) => p.isPrimary) || res.passengers?.[0] || { name: res.nombreCliente || 'Cliente', lastName: '' };
      
      // Construimos el HTML de las habitaciones dinámicamente
      let roomsHtml = '';
      if (res.selectedCategories && res.selectedCategories.length > 0) {
        res.selectedCategories.forEach((room: any) => {
          roomsHtml += `
            <div style="background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
              <p style="margin: 0 0 5px; font-size: 16px; font-weight: bold;">
                <span style="background: #1b5e20; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 6px;">${room.qty}x</span> 
                ${room.name}
              </p>
              <p style="margin: 0 0 5px; font-size: 14px; color: #555;">Tipo: ${room.type}</p>
              <p style="margin: 0; font-size: 14px; color: #777;">Extras: ${room.amenities?.join(', ') || 'Estándar'}</p>
            </div>
          `;
        });
      } else {
        roomsHtml = `<p style="margin: 0; font-size: 16px;">Habitación: ${res.selectedRoom?.name || 'Estándar'}</p>`;
      }

      element.innerHTML = `
        <div style="background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden; font-family: sans-serif;">
          
          <div style="background: #1b5e20; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">Detalles de Reserva</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Localizador: <strong>${res.id}</strong></p>
          </div>

          <div style="padding: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <p style="color: #666; font-size: 14px; margin: 0 0 5px; text-transform: uppercase;">Fecha Entrada</p>
                <h3 style="margin: 0; font-size: 20px; color: #111;">${new Date(res.fechaEntrada).toLocaleDateString()}</h3>
              </div>
              <div style="text-align: right;">
                <p style="color: #666; font-size: 14px; margin: 0 0 5px; text-transform: uppercase;">Fecha Salida</p>
                <h3 style="margin: 0; font-size: 20px; color: #111;">${new Date(res.fechaSalida).toLocaleDateString()}</h3>
              </div>
            </div>

            <hr style="border: none; border-top: 2px dashed #eee; margin: 30px 0;">

            <h3 style="margin: 0 0 15px; color: #1b5e20; font-size: 20px;">Titular de la reserva</h3>
            <p style="margin: 0 0 5px; font-size: 18px; font-weight: bold; color: #333;">${titular.name} ${titular.lastName}</p>
            <p style="margin: 0; color: #666; font-size: 16px;">DNI: ${titular.dni || '-'}</p>
            <p style="margin: 5px 0 0; color: #666; font-size: 16px;">Tel: ${titular.phone || '-'}</p>

            <hr style="border: none; border-top: 2px dashed #eee; margin: 30px 0;">

            <div style="display: flex; gap: 40px;">
              <div style="flex: 1;">
                 <h3 style="margin: 0 0 15px; color: #1b5e20; font-size: 20px;">Alojamiento</h3>
                 ${roomsHtml}
                 <p style="margin: 15px 0 0; font-size: 16px; color: #555;"><strong>Ocupantes totales:</strong> ${res.adults || 0} Ad, ${res.children || 0} Ni</p>
              </div>
              <div style="flex: 1;">
                 <h3 style="margin: 0 0 15px; color: #1b5e20; font-size: 20px;">Condiciones</h3>
                 <p style="margin: 0 0 12px; font-size: 16px;"><strong>Pensión:</strong> ${res.selectedPension?.name || 'Solo Alojamiento'}</p>
                 <div style="background: ${res.estado === 'Confirmada' ? '#e8f5e9' : '#fff3e0'}; padding: 12px; border-radius: 8px;">
                   <p style="margin: 0; font-size: 16px; color: #333;">
                     <strong>Estado de Reserva:</strong> 
                     <span style="color: ${res.estado === 'Confirmada' ? '#4caf50' : '#f57c00'}; font-weight: bold; margin-left: 5px;">${res.estado || 'Pendiente'}</span>
                   </p>
                 </div>
              </div>
            </div>

            <hr style="border: none; border-top: 2px dashed #eee; margin: 30px 0;">

            <div style="text-align: right;">
               <p style="color: #666; font-size: 16px; margin: 0 0 5px; text-transform: uppercase;">Importe Total</p>
               <h2 style="margin: 0; font-size: 32px; color: #111;">${this.formatCurrency(this.displayTotal(res))}</h2>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(element);

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      
      const fileName = `Reserva_${res.id || 'Hotel'}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Detalles de tu Reserva',
          text: 'Aquí tienes el comprobante de tu reserva en nuestro hotel.',
          url: savedFile.uri,
          dialogTitle: 'Compartir o Guardar Reserva'
        });
      } else {
        pdf.save(fileName);
      }

      document.body.removeChild(element);
      await loading.dismiss();

    } catch (error) {
      console.error('Error generando PDF', error);
      await loading.dismiss();
      const alert = await this.alertCtrl.create({
        header: 'Error',
        message: 'No se pudo generar el PDF de la reserva.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}