import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { SelectionService } from '../services/selection.service';
import { SearchService, SearchCriteria } from '../services/search.service';
import { AuthService } from '../services/auth.service'; 
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
  passengers: Array<any> = [];
  passengersErrors: Array<any> = [];
  formVisible = false;
  editingIndex: number | null = null;
  showProceed = false;

  get totalAllowed() {
    if (!this.criteria) return Infinity;
    return (Number(this.criteria.adults || 0) + Number(this.criteria.children || 0));
  }

  countAdults() { return this.passengers.filter(p => p.type === 'adult').length; }
  countChildren() { return this.passengers.filter(p => p.type === 'child').length; }
  canAddPassenger() { return this.passengers.length < this.totalAllowed; }

  isPassengersMatchingCriteria() {
    if (!this.criteria) return true;
    const adults = Number(this.criteria.adults || 0);
    const children = Number(this.criteria.children || 0);
    return this.countAdults() === adults && this.countChildren() === children && this.passengers.length === (adults + children);
  }

  constructor(
    private selectionService: SelectionService, 
    private router: Router, 
    private searchService: SearchService, 
    private toastCtrl: ToastController,
    private auth: AuthService 
  ) { }

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
        this.initPassengersErrors();
      } else {
        const user = this.auth.getUser();
        if (user) {
          this.autoFillPrimary(user);
        }
      }
    } catch (e) { }
  }

  initPassengersErrors() {
    this.passengersErrors = this.passengers.map(() => ({
      name: false, lastName: false, dni: false, phone: false, email: false
    }));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.criteriaSub?.unsubscribe();
  }

  onPensionChange(ev: any) {
    const id = ev && ev.detail ? ev.detail.value : ev;
    this.selectedPensionId = id;
    try { localStorage.setItem('selectedPension', String(id)); } catch (e) { }
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

  private autoFillPrimary(user: any) {
    let fName = user.nombre || '';
    let lName = '';
    const parts = fName.split(' ');
    if (parts.length > 1) {
      fName = parts[0];
      lName = parts.slice(1).join(' ');
    }

    this.passengers.unshift({
      isPrimary: true,
      name: fName,
      lastName: lName,
      phone: user.telefono || '',
      email: user.email || '',
      dni: user.dni || '',
      allergies: '',
      type: 'adult'
    });
    this.passengersErrors.unshift({ name: false, lastName: false, dni: false, phone: false, email: false });
  }

  // --- NUEVA FUNCIÓN: USAR MIS DATOS ---
  useMyData(index: number) {
    const user = this.auth.getUser();
    if (!user) return;

    let fName = user.nombre || '';
    let lName = '';
    const parts = fName.split(' ');
    if (parts.length > 1) {
      fName = parts[0];
      lName = parts.slice(1).join(' ');
    }

    // Actualizamos los datos del pasajero en ese índice
    this.passengers[index].name = fName;
    this.passengers[index].lastName = lName;
    this.passengers[index].phone = user.telefono || '';
    this.passengers[index].email = user.email || '';
    this.passengers[index].dni = user.dni || '';

    // Limpiamos los posibles errores
    this.passengersErrors[index] = { name: false, lastName: false, dni: false, phone: false, email: false };

    // Mostramos un mensaje de confirmación
    this.toastCtrl.create({
      message: 'Datos autocompletados correctamente',
      duration: 2000,
      color: 'success',
      position: 'bottom',
      icon: 'checkmark-circle'
    }).then(t => t.present());
  }

  addPrimary() {
    if (this.hasPrimary()) return;
    
    const user = this.auth.getUser();
    if (user) {
      this.autoFillPrimary(user);
    } else {
      this.passengers.unshift({ isPrimary: true, name: '', lastName: '', phone: '', email: '', dni: '', allergies: '', type: 'adult' });
      this.passengersErrors.unshift({ name: false, lastName: false, dni: false, phone: false, email: false });
    }
    
    this.formVisible = true;
    this.editingIndex = 0;
  }

  addPassenger() {
    if (!this.canAddPassenger()) {
      (async () => {
        const t = await this.toastCtrl.create({ message: 'Límite de pasajeros alcanzado', duration: 2000, color: 'warning', position: 'bottom' });
        await t.present();
      })();
      return;
    }
    
    let defaultType: 'adult' | 'child' = 'adult';
    if (this.criteria) {
      const adultsAllowed = Number(this.criteria.adults || 0);
      const childrenAllowed = Number(this.criteria.children || 0);
      if (this.countAdults() >= adultsAllowed && this.countChildren() < childrenAllowed) defaultType = 'child';
      else if (this.countAdults() >= adultsAllowed) defaultType = 'child';
    }
    
    this.passengers.push({ isPrimary: false, name: '', lastName: '', dni: '', allergies: '', type: defaultType });
    this.passengersErrors.push({ name: false, lastName: false, dni: false, phone: false, email: false });
    this.formVisible = true;
    this.editingIndex = this.passengers.length - 1;
  }

  removePassenger(index: number) {
    if (index >= 0 && index < this.passengers.length) {
      this.passengers.splice(index, 1);
      this.passengersErrors.splice(index, 1);
      if (this.editingIndex !== null) {
        if (this.editingIndex === index) this.editingIndex = null;
        else if (this.editingIndex > index) this.editingIndex--;
      }
    }
  }

  validatePassenger(p: any) {
    const errors: any = { name: false, lastName: false, dni: false, phone: false, email: false };
    const nameRe = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'\-]{2,}$/;
    const dniRe = /^\d{8}[A-Za-z]$/; 
    const phoneRe = /^\d{9}$/; 
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!p.name || !nameRe.test(String(p.name).trim())) errors.name = true;
    if (!p.lastName || !nameRe.test(String(p.lastName).trim())) errors.lastName = true;
    if (!p.dni || !dniRe.test(String(p.dni).trim())) errors.dni = true;
    
    if (p.isPrimary) {
      if (!p.phone || !phoneRe.test(String(p.phone).trim())) errors.phone = true;
      if (!p.email || !emailRe.test(String(p.email).trim())) errors.email = true;
    } else {
      if (p.phone && !phoneRe.test(String(p.phone).trim())) errors.phone = true;
      if (p.email && !emailRe.test(String(p.email).trim())) errors.email = true;
    }

    return errors;
  }

  async savePassengers() {
    if (!this.isPassengersMatchingCriteria()) {
      const t = await this.toastCtrl.create({ message: 'Los pasajeros no coinciden con la reserva', duration: 2000, color: 'danger', position: 'bottom' });
      await t.present();
      return;
    }

    let firstInvalid: number | null = null;
    for (let i = 0; i < this.passengers.length; i++) {
      const p = this.passengers[i];
      const errs = this.validatePassenger(p);
      this.passengersErrors[i] = errs;
      if (firstInvalid === null && Object.values(errs).some(v => v === true)) firstInvalid = i;
    }
    
    if (firstInvalid !== null) {
      this.editingIndex = firstInvalid;
      const t = await this.toastCtrl.create({ message: 'Revisa los campos marcados en rojo', duration: 2200, color: 'warning', position: 'bottom' });
      await t.present();
      return;
    }
    
    try {
      localStorage.setItem('reservationPassengers', JSON.stringify(this.passengers));
      const t = await this.toastCtrl.create({ message: 'Pasajeros guardados correctamente', duration: 1500, color: 'success', position: 'bottom' });
      await t.present();
      this.formVisible = false;
      this.editingIndex = null;
    } catch (e) {
      const t = await this.toastCtrl.create({ message: 'Error guardando pasajeros', duration: 1800, color: 'danger', position: 'bottom' });
      await t.present();
    }
  }

  editPassenger(index: number) {
    if (index < 0 || index >= this.passengers.length) return;
    this.formVisible = true;
    this.editingIndex = index;
    setTimeout(() => {
      const el = document.getElementById(`passenger-${index}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, 120);
  }

  closeEditing() {
    this.editingIndex = null;
  }
}