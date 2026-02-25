import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { IonicModule, AlertController, ModalController, PopoverController, LoadingController } from '@ionic/angular';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api'; 
import { AuthService } from '../services/auth.service';
import { ReservationInfoComponent } from '../tab4/reservation-info.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { UserProfileModalComponent } from '../user-profile-modal/user-profile-modal.component';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  habitacionesDb: any[] = []; 

  constructor(
    private alertCtrl: AlertController, 
    private modalCtrl: ModalController,
    private popoverCtrl: PopoverController,
    private loadingCtrl: LoadingController,
    private apiService: ApiService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
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
    this.apiService.getHabitaciones().subscribe(data => {
       this.habitacionesDb = data || [];
    });
    this.loadReservations();
  }

  async ionViewWillEnter() {
    this.currentUser = this.auth.getUser();
    this.loadReservations();
  }

  async doRefresh(event?: any) {
    this.apiService.getHabitaciones().subscribe(data => this.habitacionesDb = data || []);
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
        this.reservations = data.map(r => {
          
          const numAdultos = Number(r.adultos ?? r.adults ?? r.pax ?? 1);
          const numNinos = Number(r.ninos ?? r.children ?? 0);
          const numHabs = Number(r.numeroHabitaciones ?? r.habitaciones ?? 1);
          
          // === TRADUCTOR BLINDADO DE MASCOTAS ===
          const rawPet = r.mascota ?? r.pets ?? r.mascotas ?? r.llevaMascota;
          const petStr = String(rawPet).trim().toLowerCase();
          const viajaConMascota = (rawPet === true || petStr === 'true' || petStr === 'si' || petStr === 'sí' || petStr === '1');
          
          // === LECTOR DE ALERGIAS GENERALES (Desde Admin) ===
          const hasAllergies = r.notas && String(r.notas).trim() !== '' && String(r.notas).trim().toLowerCase() !== 'ninguna';
          const alergiasExtra = hasAllergies ? String(r.notas).trim() : '';

          let precioCalculado = Number(r.precioTotal ?? r.total ?? 0);
          if (precioCalculado <= 0) {
            const nights = Math.ceil((new Date(r.fechaSalida).getTime() - new Date(r.fechaEntrada).getTime()) / 86400000) || 1;
            const roomPx = Number(r.roomPrice || 0);
            const penPx = Number(r.pensionPrice || 0);
            precioCalculado = (roomPx * nights) + (penPx * (numAdultos + numNinos) * Math.max(1, nights));
          }

          return {
            ...r,
            _adults: numAdultos,
            _children: numNinos,
            _rooms: numHabs,
            _mascota: viajaConMascota,
            _alergias: alergiasExtra, // Guardamos las alergias globales para el cliente
            _total: precioCalculado,
            _estado: r.estado || r.status || 'Pendiente',
            _pension: r.pension || r.selectedPension?.name || 'Sin Pensión'
          };

        }).sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());
        
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: (err: any) => console.error('Error cargando reservas:', err)
    });
  }

  getRoomTitle(res: any): string {
    if (res.selectedCategories && res.selectedCategories.length > 0) {
      const first = res.selectedCategories[0];
      const count = res.selectedCategories.reduce((sum: number, c: any) => sum + Number(c.qty || 1), 0);
      const totalVisual = Math.max(count, res._rooms);
      return totalVisual > 1 ? `${first.name || first.nombre} (+${totalVisual - 1} más)` : (first.name || first.nombre);
    }
    return res.selectedRoom?.nombre || res.selectedRoom?.name || 'Reserva de Alojamiento';
  }

  buildSafeCategories(res: any): any[] {
    let safeCategories = res.selectedCategories ? JSON.parse(JSON.stringify(res.selectedCategories)) : [];
    let webRoomsCount = safeCategories.reduce((sum: number, cat: any) => sum + Number(cat.qty || 1), 0);
    const totalRooms = res._rooms;

    safeCategories.forEach((cat: any) => {
      cat.name = cat.name || cat.nombre || 'Habitación Reservada';
      cat.type = cat.type || cat.tipo || 'Alojamiento';
      let am = cat.amenities || cat.extras || cat.caracteristicas || cat.comodidades;
      if (typeof am === 'string' && am.trim() !== '') {
        cat.amenities = am.split(',').map((s:string) => s.trim());
      } else if (!Array.isArray(am)) {
        cat.amenities = []; 
      }
    });

    const asignadasStr = res.habitacion || '';
    const arrayHabs = asignadasStr.split(',').map((h:string) => h.trim()).filter((h:string) => h !== '' && h !== 'Sin asignar');
    const manualHabs = arrayHabs.slice(webRoomsCount);

    if (manualHabs.length > 0) {
      const extraGroups: any = {};

      manualHabs.forEach((numHab: string) => {
        const dbRoom = this.habitacionesDb.find(x => String(x.numero) === String(numHab));
        
        let realType = dbRoom?.tipo || dbRoom?.type || 'Estándar';
        let rName = `Habitación ${realType}`; 
        let rType = 'Asignada por el hotel';
        
        let rawAmenities = dbRoom?.amenities || dbRoom?.extras || dbRoom?.caracteristicas || dbRoom?.comodidades;
        let rAmenities: string[] = [];
        
        if (Array.isArray(rawAmenities)) rAmenities = rawAmenities;
        else if (typeof rawAmenities === 'string' && rawAmenities.trim() !== '') rAmenities = rawAmenities.split(',').map((s:string) => s.trim());
        
        let groupKey = rName;
        if (!extraGroups[groupKey]) {
          extraGroups[groupKey] = { name: rName, type: rType, qty: 0, amenities: rAmenities };
        }
        extraGroups[groupKey].qty += 1;
      });

      Object.values(extraGroups).forEach((group: any) => {
        safeCategories.push(group);
      });

      const extrasAssigned = manualHabs.length;
      const extrasNeeded = totalRooms - webRoomsCount;
      if (extrasNeeded > extrasAssigned) {
        safeCategories.push({
          name: 'Habitación extra (Pendiente)', type: 'Alojamiento',
          qty: extrasNeeded - extrasAssigned, amenities: []
        });
      }
    } else if (totalRooms > webRoomsCount) {
      safeCategories.push({
        name: 'Habitación extra (Pendiente)', type: 'Alojamiento',
        qty: totalRooms - webRoomsCount, amenities: []
      });
    } else if (totalRooms < webRoomsCount && safeCategories.length > 0) {
      let diffToSubtract = webRoomsCount - totalRooms;
      for (let i = safeCategories.length - 1; i >= 0; i--) {
        if (diffToSubtract <= 0) break;
        if (safeCategories[i].qty > diffToSubtract) {
          safeCategories[i].qty -= diffToSubtract;
          diffToSubtract = 0;
        } else {
          diffToSubtract -= safeCategories[i].qty;
          safeCategories.splice(i, 1);
        }
      }
    }

    if (safeCategories.length === 0) {
       safeCategories = [{
          name: 'Habitación Asignada',
          type: 'Alojamiento',
          qty: totalRooms,
          amenities: []
       }];
    }

    return safeCategories;
  }

  async openInfo(res: any) {
    const safeCategories = this.buildSafeCategories(res);

    const modal = await this.modalCtrl.create({
      component: ReservationInfoComponent,
      componentProps: {
        data: {
          criteria: {
            checkin: res.fechaEntrada, checkout: res.fechaSalida,
            adults: res._adults, children: res._children,
            rooms: res._rooms, 
            pets: res._mascota // Mandamos el traductor de mascotas aquí
          },
          selectedCart: {
            selectedCategories: safeCategories, 
            totalRooms: res._rooms
          },
          selectedPension: { 
            name: res._pension, price: Number(res.pensionPrice || 0), includes: [] 
          },
          passengers: res.passengers || [],
          total: res._total, 
          estado: res._estado,
          alergiasGenerales: res._alergias // Inyectamos las alergias de admin
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
        { text: 'Sí, cancelar', handler: () => {
            this.apiService.cancelarReserva(res.id).subscribe(() => this.loadReservations());
          }
        }
      ]
    });
    await alert.present();
  }

  formatCurrency(val: number) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(val) || 0);
  }

  async downloadPDF(res: any) {
    const loading = await this.loadingCtrl.create({ message: 'Generando PDF...', spinner: 'crescent' });
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
      
      const titular = res.passengers?.find((p:any) => p.isPrimary) || res.passengers?.[0] || { name: res.nombreCliente || res.titular || 'Cliente', lastName: '' };
      
      let roomsHtml = '';
      const safeCategories = this.buildSafeCategories(res);

      safeCategories.forEach((room: any) => {
        let extrasTexto = (Array.isArray(room.amenities) && room.amenities.length > 0) ? room.amenities.join(', ') : '';

        roomsHtml += `
          <div style="background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <p style="margin: 0 0 5px; font-size: 16px; font-weight: bold;">
              <span style="background: #1b5e20; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 6px;">${room.qty}x</span> 
              ${room.name}
            </p>
            <p style="margin: 0 0 5px; font-size: 14px; color: #555;">Tipo: ${room.type || 'Alojamiento'}</p>
            ${extrasTexto ? `<p style="margin: 0; font-size: 14px; color: #777;">Extras: ${extrasTexto}</p>` : ''}
          </div>
        `;
      });

      element.innerHTML = `
        <div style="background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden; font-family: sans-serif;">
          <div style="background: #1b5e20; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">Detalles de Reserva</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Localizador: <strong>${res.id || res.numero}</strong></p>
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
            <p style="margin: 0 0 5px; font-size: 18px; font-weight: bold; color: #333;">${titular.name} ${titular.lastName || ''}</p>
            <p style="margin: 0; color: #666; font-size: 16px;">DNI: ${titular.dni || '-'}</p>
            <p style="margin: 5px 0 0; color: #666; font-size: 16px;">Tel: ${titular.phone || '-'}</p>

            <hr style="border: none; border-top: 2px dashed #eee; margin: 30px 0;">

            <div style="display: flex; gap: 40px;">
              <div style="flex: 1;">
                 <h3 style="margin: 0 0 15px; color: #1b5e20; font-size: 20px;">Alojamiento</h3>
                 ${roomsHtml}
                 <p style="margin: 15px 0 0; font-size: 16px; color: #555;"><strong>Ocupantes totales:</strong> ${res._adults} Ad, ${res._children} Ni</p>
                 <p style="margin: 5px 0 0; font-size: 16px; color: ${res._mascota ? '#10b981' : '#555'}; font-weight: bold;">
                    Mascotas: ${res._mascota ? 'Sí, viaja con mascota' : 'No'}
                 </p>
              </div>
              <div style="flex: 1;">
                 <h3 style="margin: 0 0 15px; color: #1b5e20; font-size: 20px;">Condiciones</h3>
                 <p style="margin: 0 0 12px; font-size: 16px;"><strong>Pensión:</strong> ${res._pension}</p>
                 
                 ${res._alergias ? `
                 <div style="background: #fee2e2; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                   <p style="margin: 0; font-size: 16px; color: #b91c1c;">
                     <strong>Alergias/Notas:</strong> ${res._alergias}
                   </p>
                 </div>
                 ` : ''}

                 <div style="background: ${res._estado === 'Confirmada' ? '#e8f5e9' : '#fff3e0'}; padding: 12px; border-radius: 8px;">
                   <p style="margin: 0; font-size: 16px; color: #333;">
                     <strong>Estado de Reserva:</strong> 
                     <span style="color: ${res._estado === 'Confirmada' ? '#4caf50' : '#f57c00'}; font-weight: bold; margin-left: 5px;">${res._estado}</span>
                   </p>
                 </div>
              </div>
            </div>

            <hr style="border: none; border-top: 2px dashed #eee; margin: 30px 0;">

            <div style="text-align: right;">
               <p style="color: #666; font-size: 16px; margin: 0 0 5px; text-transform: uppercase;">Importe Total</p>
               <h2 style="margin: 0; font-size: 32px; color: #111;">${this.formatCurrency(res._total)}</h2>
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
      
      const fileName = `Reserva_${res.id || res.numero || 'Hotel'}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({ path: fileName, data: pdfBase64, directory: Directory.Cache });
        await Share.share({ title: 'Detalles de Reserva', url: savedFile.uri });
      } else {
        pdf.save(fileName);
      }

      document.body.removeChild(element);
      await loading.dismiss();

    } catch (error) {
      console.error('Error generando PDF', error);
      await loading.dismiss();
      const alert = await this.alertCtrl.create({ header: 'Error', message: 'No se pudo generar el PDF.', buttons: ['OK'] });
      await alert.present();
    }
  }
}