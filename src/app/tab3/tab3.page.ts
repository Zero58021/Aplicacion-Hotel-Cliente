import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { SelectionService } from '../services/selection.service';
import { SearchService, SearchCriteria } from '../services/search.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab3',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
})

export class Tab3Page implements OnInit, OnDestroy {
  selectedRoom: any | null = null;
  private sub?: Subscription;
  criteria: SearchCriteria | null = null;
  private criteriaSub?: Subscription;
  pensions: Array<any> = [
    { id: 'none', name: 'Sin Pensión', includes: [], price: 0 },
    { id: 'pc', name: 'Pensión Completa', includes: ['Desayuno', 'Almuerzo', 'Cena'], price: 30 },
    { id: 'mp', name: 'Media Pensión', includes: ['Desayuno', 'Cena'], price: 18 },
    { id: 'sd', name: 'Solo Desayuno', includes: ['Desayuno'], price: 8 },
    { id: 'ti', name: 'Todo Incluido', includes: ['Desayuno', 'Almuerzo', 'Cena', 'Bebidas'], price: 50 }
  ];
  selectedPensionId: string | null = null;
  // Pasajeros de la reserva
  passengers: Array<any> = [];
  formVisible = false;
  showProceed = false;

  constructor(private selectionService: SelectionService, private router: Router, private searchService: SearchService, private toastCtrl: ToastController) { }

  ngOnInit() {
    this.selectionService.loadFromStorage();
    this.sub = this.selectionService.selectedRoom$.subscribe(r => this.selectedRoom = r);
    this.criteriaSub = this.searchService.criteria$.subscribe(c => this.criteria = c);
    try {
      const sp = localStorage.getItem('selectedPension');
      if (sp) this.selectedPensionId = sp;
      const ps = localStorage.getItem('reservationPassengers');
      if (ps) {
        const parsed = JSON.parse(ps) || [];
        // Ensure backwards-compatibility: fill missing fields
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

  onPensionChange(ev: any) {
    const id = ev && ev.detail ? ev.detail.value : ev;
    this.selectedPensionId = id;
    try { localStorage.setItem('selectedPension', id); } catch (e) { }
  }

  get selectedPension() {
    return this.pensions.find(p => p.id === this.selectedPensionId) || null;
  }

  goToTab2(ev?: Event) {
    if (ev) ev.stopPropagation();
    this.router.navigateByUrl('/tabs/tab2');
  }

  proceedToPayment(ev?: Event) {
    if (ev) ev.stopPropagation();
    this.router.navigateByUrl('/tabs/tab4');
  }

  onContentScroll(ev?: any) {
    const scrollTop = ev && ev.detail ? ev.detail.scrollTop : 0;
    this.showProceed = scrollTop > 80;
  }

  editReservation(ev?: Event) {
    if (ev) ev.stopPropagation();
    this.router.navigateByUrl('/tabs/tab1');
  }

  togglePassengers() {
    this.formVisible = !this.formVisible;
  }

  hasPrimary() {
    return this.passengers.some(p => p.isPrimary);
  }

  addPrimary() {
    if (this.hasPrimary()) return;
    this.passengers.unshift({ isPrimary: true, name: '', lastName: '', phone: '', email: '', dni: '', allergies: '', type: 'adult' });
  }

  addPassenger() {
    // non-primary passenger: only name, lastName, dni, allergies
    this.passengers.push({ isPrimary: false, name: '', lastName: '', dni: '', allergies: '', type: 'adult' });
  }

  removePassenger(index: number) {
    if (index >= 0 && index < this.passengers.length) {
      this.passengers.splice(index, 1);
    }
  }

  async savePassengers() {
    try {
      localStorage.setItem('reservationPassengers', JSON.stringify(this.passengers));
      const t = await this.toastCtrl.create({ message: 'Pasajeros guardados', duration: 1500, color: 'success', position: 'bottom' });
      await t.present();
      this.formVisible = false;
    } catch (e) {
      const t = await this.toastCtrl.create({ message: 'Error guardando pasajeros', duration: 1800, color: 'danger', position: 'bottom' });
      await t.present();
    }
  }

  editPassenger(index: number) {
    if (index < 0 || index >= this.passengers.length) return;
    this.formVisible = true;
    // wait a tick so the DOM renders the form, then scroll to it
    setTimeout(() => {
      const el = document.getElementById(`passenger-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  }

}
