import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { SelectionService } from '../services/selection.service';
import { SearchService, SearchCriteria } from '../services/search.service';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular';
import { ReservationInfoComponent } from './reservation-info.component';

@Component({
  selector: 'app-tab4',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit, OnDestroy {
  selectedRoom: any | null = null;
  criteria: SearchCriteria | null = null;
  passengers: Array<any> = [];
  selectedPensionId: string | null = null;
  pensions: Array<any> = [
    { id: 'none', name: 'Sin Pensión', includes: [], price: 0 },
    { id: 'pc', name: 'Pensión Completa', includes: ['Desayuno', 'Almuerzo', 'Cena'], price: 30 },
    { id: 'mp', name: 'Media Pensión', includes: ['Desayuno', 'Cena'], price: 18 },
    { id: 'sd', name: 'Solo Desayuno', includes: ['Desayuno'], price: 8 },
    { id: 'ti', name: 'Todo Incluido', includes: ['Desayuno', 'Almuerzo', 'Cena', 'Bebidas'], price: 50 }
  ];

  private sub?: Subscription;
  private criteriaSub?: Subscription;
  paymentMethod: 'online' | 'inperson' = 'online';
  paymentSuccess = false;

  constructor(private selectionService: SelectionService, private searchService: SearchService, private router: Router, private alertCtrl: AlertController, private modalCtrl: ModalController) { }

  ngOnInit() {
    this.selectionService.loadFromStorage();
    this.sub = this.selectionService.selectedRoom$.subscribe(r => this.selectedRoom = r);
    this.criteriaSub = this.searchService.criteria$.subscribe(c => this.criteria = c);

    try {
      const sp = localStorage.getItem('selectedPension');
      if (sp !== null) this.selectedPensionId = sp;
      const ps = localStorage.getItem('reservationPassengers');
      if (ps) {
        const parsed = JSON.parse(ps) || [];
        this.passengers = parsed.map((p: any) => ({
          isPrimary: !!p.isPrimary,
          name: p.name || '',
          lastName: p.lastName || '',
          phone: p.phone || '',
          email: p.email || '',
          dni: p.dni || '',
          allergies: p.allergies || '',
          type: p.type || 'adult'
        }));
      }
    } catch (e) { }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.criteriaSub?.unsubscribe();
  }

  get selectedPension() {
    return this.pensions.find(p => p.id === this.selectedPensionId) || null;
  }

  goToTab3(ev?: Event) {
    if (ev) ev.stopPropagation();
    this.router.navigateByUrl('/tabs/tab3');
  }

  /** Número de noches calculadas a partir de `criteria.checkin` y `criteria.checkout` */
  get nights(): number {
    try {
      if (!this.criteria || !this.criteria.checkin || !this.criteria.checkout) return 0;
      const ci = new Date(this.criteria.checkin);
      const co = new Date(this.criteria.checkout);
      const diff = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch (e) { return 0; }
  }

  /** Coste de la habitación = precio por noche * noches */
  get roomCost(): number {
    if (!this.selectedRoom || !this.selectedRoom.price) return 0;
    const price = Number(this.selectedRoom.price) || 0;
    const rooms = Number(this.criteria?.rooms || 1) || 1;
    return price * this.nights * rooms;
  }

  /** Coste de pensión = precio (por persona/día) * adultos * noches */
  get pensionCost(): number {
    const pen = this.selectedPension;
    if (!pen || !this.criteria) return 0;
    const price = Number(pen.price) || 0;
    const adults = Number(this.criteria.adults || 0) || 0;
    const children = Number(this.criteria.children || 0) || 0;
    const persons = adults + children;
    return price * persons * this.nights;
  }

  /** Total aproximado */
  get totalCost(): number {
    return this.roomCost + this.pensionCost;
  }

  async openInfo(ev?: Event) {
    if (ev) ev.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: ReservationInfoComponent,
      componentProps: {
        data: {
          criteria: this.criteria,
          selectedRoom: this.selectedRoom,
          selectedPension: this.selectedPension,
          passengers: this.passengers
        }
      }
    });
    await modal.present();
  }

  async finalizePayment(ev?: Event) {
    if (ev) ev.stopPropagation();

    if (this.paymentMethod === 'online') {
      const confirm = await this.alertCtrl.create({
        header: 'Pagar online',
        message: 'Será redirigido a la pasarela de pago. ¿Desea continuar?',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Continuar',
            handler: async () => {
              const processing = await this.alertCtrl.create({ header: 'Procesando', message: 'Procesando pago...', buttons: [] });
              await processing.present();
              setTimeout(async () => {
                await processing.dismiss();
                this.showSuccessAnimation();
              }, 900);
            }
          }
        ]
      });
      await confirm.present();
      return;
    }

    // Pagar en persona
    const confirmInPerson = await this.alertCtrl.create({
      header: 'Pagar en persona',
      message: 'Ha seleccionado pagar en persona. La reserva quedará registrada y podrá abonar al llegar. ¿Desea confirmar la reserva?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: async () => {
            this.showSuccessAnimation();
          }
        }
      ]
    });
    await confirmInPerson.present();
  }

  showSuccessAnimation() {
    this.paymentSuccess = true;
    // Auto-hide after animation ends
    setTimeout(() => {
      (async () => {
        // Construir objeto de reserva a partir de datos actuales
        try {
          const primary = this.passengers.find(p => p.isPrimary) || this.passengers[0] || {} as any;
          const nombre = ((primary.name || '') + ' ' + (primary.lastName || '')).trim() || 'Cliente';
          const reservation = {
            id: 'R-' + Math.floor(Math.random() * 900000 + 100000),
            nombreCliente: nombre,
            email: primary.email || '',
            telefono: primary.phone || '',
            fechaEntrada: this.criteria?.checkin || (new Date()).toISOString().slice(0,10),
            fechaSalida: this.criteria?.checkout || (new Date()).toISOString().slice(0,10),
            habitaciones: Number(this.criteria?.rooms || 1),
            adults: Number(this.criteria?.adults || 0),
            children: Number(this.criteria?.children || 0),
            pax: (Number(this.criteria?.adults || 0) + Number(this.criteria?.children || 0)) || 1,
            nights: this.nights || 0,
            roomPrice: this.selectedRoom?.price ? Number(this.selectedRoom.price) : 0,
            pensionPrice: this.selectedPension ? Number(this.selectedPension.price || 0) : 0,
            total: Number((this.totalCost || 0).toFixed(2)),
            // Persist full objects so Tab5 can show details
            selectedRoom: this.selectedRoom ? {
              name: this.selectedRoom.name,
              type: this.selectedRoom.type,
              floor: this.selectedRoom.floor,
              price: this.selectedRoom.price,
              amenities: this.selectedRoom.amenities || []
            } : null,
            selectedPension: this.selectedPension ? {
              id: this.selectedPension.id,
              name: this.selectedPension.name,
              price: this.selectedPension.price,
              includes: this.selectedPension.includes || []
            } : null,
            passengers: Array.isArray(this.passengers) ? this.passengers.map(p => ({
              isPrimary: !!p.isPrimary,
              name: p.name || '',
              lastName: p.lastName || '',
              phone: p.phone || '',
              email: p.email || '',
              dni: p.dni || '',
              allergies: p.allergies || '',
              type: p.type || 'adult'
            })) : [],
            estado: 'Confirmada',
            notas: primary.allergies || ''
          };
          await this.addReservationToStorage(reservation);
        } catch (e) { console.error('Error creando reserva tras pago:', e); }

        this.paymentSuccess = false;
        // Navegar a la pestaña de reservas
        try { this.router.navigateByUrl('/tabs/tab5'); } catch(e) {}
      })();
    }, 2200);
  }

  private async addReservationToStorage(reservation: any) {
    try {
      const ret = await Preferences.get({ key: 'reservations' });
      const arr = ret && ret.value ? JSON.parse(ret.value) : [];
      arr.unshift(reservation);
      await Preferences.set({ key: 'reservations', value: JSON.stringify(arr) });
    } catch (e) {
      console.error('Error guardando reserva en storage:', e);
    }
  }

}
