import { Component, ViewChildren, ViewChild, QueryList, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PhotoModalComponent } from '../photo-modal/photo-modal.component';
import { Router } from '@angular/router';
import { SearchService } from '../services/search.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements AfterViewInit, OnDestroy {
  showText = false;

  // Comentarios (opiniones) -- ejemplo de comentarios previos
  comments: Array<{ name: string; text: string; rating: number; date: Date }> = [
    { name: 'Ana', text: 'Excelente atención y limpieza.', rating: 5, date: new Date('2025-01-15T10:30:00') },
    { name: 'Carlos', text: 'Buena ubicación pero un poco ruidoso.', rating: 4, date: new Date('2025-02-02T13:20:00') }
  ];

  newComment: { name: string; text: string; rating: number } = { name: '', text: '', rating: 5 };

  // Variables para el widget de reserva
  checkinDate: string | null = null;
  checkoutDate: string | null = null;
  adults = 2;
  children = 0;
  rooms = 1;
  hasPets = false;
  adultsOptions: number[] = [];
  childrenOptions: number[] = [];
  roomsOptions: number[] = [];
  // calendar state for inline custom calendar
  calYear = new Date().getFullYear();
  calMonth = new Date().getMonth(); // 0-based
  @ViewChild('checkinPicker', { static: false }) checkinPicker: any;
  @ViewChild('checkoutPicker', { static: false }) checkoutPicker: any;
  activePicker: 'checkin' | 'checkout' | null = null;
  @ViewChild('adultSelect', { static: false }) adultSelect: any;
  @ViewChild('childSelect', { static: false }) childSelect: any;
  @ViewChild('roomSelect', { static: false }) roomSelect: any;
  // petSelect removed: using boolean toggle instead

  // Datos del cuadro de contacto (fijos). Modifica aquí los valores que quieras mostrar.
  contact: { phone?: string; email?: string; location?: string } = {
    phone: '+34 600 000 000',
    email: 'info@hotel-ejemplo.com',
    location: 'Ciudad, Calle 1'
  };

  @ViewChildren('albumContainer') albumContainers!: QueryList<ElementRef<HTMLDivElement>>;

  // per-container state maps
  private intervalMap = new Map<HTMLElement, any>();
  private currentIndexMap = new Map<HTMLElement, number>();
  private totalSlidesMap = new Map<HTMLElement, number>();
  private isPausedMap = new Map<HTMLElement, boolean>();
  // store active requestAnimationFrame ids per container so we can cancel animations
  private rafMap = new Map<HTMLElement, number>();
  // store listeners so we can remove them on destroy
  private listenersMap = new Map<HTMLElement, { down: any; up: any; enter: any; leave: any }>();

  constructor(private modalCtrl: ModalController, private router: Router, private searchService: SearchService) {}

  ngOnInit(): void {
    // populate option arrays
    this.adultsOptions = Array.from({ length: 20 }, (_, i) => i + 1);
    this.childrenOptions = Array.from({ length: 41 }, (_, i) => i); // 0..40
    this.roomsOptions = Array.from({ length: 15 }, (_, i) => i + 1);
    // inicializar fechas por defecto: hoy (entrada) y mañana (salida)
    const today = new Date();
    const inDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const outDate = new Date(inDate);
    outDate.setDate(outDate.getDate() + 1);
    this.checkinDate = inDate.toISOString();
    this.checkoutDate = outDate.toISOString();

    // publish initial criteria
    this.updateCriteria();
  }

  // initialize calendar view when opening a picker
  initCalendar(forPicker: 'checkin' | 'checkout') {
    const refDate = forPicker === 'checkin' ? this.checkinDate : (this.checkoutDate || this.checkinDate);
    const d = refDate ? new Date(refDate) : new Date();
    this.calYear = d.getFullYear();
    this.calMonth = d.getMonth();
  }

  // navigate months
  prevMonth() { if (this.calMonth === 0) { this.calMonth = 11; this.calYear--; } else this.calMonth--; }
  nextMonth() { if (this.calMonth === 11) { this.calMonth = 0; this.calYear++; } else this.calMonth++; }

  // build matrix of weeks for current calMonth/calYear
  getCalendarMatrix(): (Date | null)[][] {
    const first = new Date(this.calYear, this.calMonth, 1);
    const startDay = first.getDay(); // 0 (Sun) .. 6
    // we want week starting Monday as in screenshot; adjust (Mon=0..Sun=6)
    const offset = (startDay + 6) % 7; // convert Sun..Sat -> 6,0,1..5
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const matrix: (Date | null)[][] = [];
    let row: (Date | null)[] = [];
    // fill leading blanks
    for (let i = 0; i < offset; i++) row.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      row.push(new Date(this.calYear, this.calMonth, day));
      if (row.length === 7) { matrix.push(row); row = []; }
    }
    if (row.length) {
      while (row.length < 7) row.push(null);
      matrix.push(row);
    }
    return matrix;
  }

  // selection from custom calendar
  selectDayFromCalendar(d: Date) {
    const iso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    if (this.activePicker === 'checkin') {
      this.checkinDate = iso;
      // if checkout empty or earlier, set checkout = checkin
      if (!this.checkoutDate || new Date(this.checkoutDate) < new Date(this.checkinDate)) {
        this.checkoutDate = iso;
      }
      this.onDatesChange();
      this.updateCriteria();
      // keep panel open so user can choose checkout if desired; if user wants auto-close, call closePickers()
    } else if (this.activePicker === 'checkout') {
      this.checkoutDate = iso;
      this.onDatesChange();
      this.updateCriteria();
      // do not close the panel automatically; keep it open for further adjustments per user request
    }
  }

  // helpers for display
  monthLabel(): string {
    return new Date(this.calYear, this.calMonth, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }

  isSameDay(aIso: string | null | undefined, d: Date): boolean {
    if (!aIso) return false;
    const a = new Date(aIso);
    return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth() && a.getDate() === d.getDate();
  }

  isInRangeDate(d: Date): boolean {
    if (!this.checkinDate || !this.checkoutDate) return false;
    const a = new Date(this.checkinDate);
    const b = new Date(this.checkoutDate);
    const cur = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return cur >= new Date(a.getFullYear(), a.getMonth(), a.getDate()) && cur <= new Date(b.getFullYear(), b.getMonth(), b.getDate());
  }

  sendContact() {
    // Método mínimo: por ahora sólo registra en consola. No se usa cuando campos son fijos.
    console.log('Contacto (fijo):', this.contact);
  }

  confirmReservation() {
    if (!this.checkinDate) return;
    (this.contact as any).reservation = {
      checkin: this.checkinDate,
      checkout: this.checkoutDate,
      adults: this.adults,
      children: this.children,
      rooms: this.rooms,
      pets: this.hasPets
    };
    console.log('Reserva rápida asignada:', (this.contact as any).reservation);
  }

  onDatesChange() {
    if (this.checkinDate && this.checkoutDate) {
      const inDate = new Date(this.checkinDate);
      const outDate = new Date(this.checkoutDate);
      if (outDate <= inDate) {
        // ajustar salida al día siguiente
        const next = new Date(inDate);
        next.setDate(next.getDate() + 1);
        this.checkoutDate = next.toISOString();
      }
    }
    this.updateCriteria();
  }

  // Ensure checkout is at least the same as checkin when user sets checkin
  onCheckinSelected() {
    if (!this.checkinDate) return;
    if (!this.checkoutDate) {
      // set checkout equal to checkin so it appears selected
      this.checkoutDate = this.checkinDate;
    } else {
      const inDate = new Date(this.checkinDate);
      const outDate = new Date(this.checkoutDate);
      if (outDate < inDate) this.checkoutDate = this.checkinDate;
    }
  }

  // utility: return array of ISO date strings for each day in [checkin, checkout]
  getStayRange(): string[] {
    if (!this.checkinDate || !this.checkoutDate) return [];
    const start = new Date(this.checkinDate);
    const end = new Date(this.checkoutDate);
    const arr: string[] = [];
    const cur = new Date(start);
    // include end date
    while (cur <= end) {
      arr.push(cur.toISOString());
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }

  formatShort(dateIso: string): string {
    try {
      const d = new Date(dateIso);
      return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    } catch (e) { return dateIso; }
  }

  search() {
    const criteria = {
      checkin: this.checkinDate,
      checkout: this.checkoutDate,
      adults: this.adults,
      children: this.children,
      rooms: this.rooms,
      pets: this.hasPets
    };
    this.searchService.setCriteria(criteria);
    // Navegar a la pestaña 2 para mostrar resultados/criterios
    this.router.navigateByUrl('/tabs/tab2');
  }

  /** Public: compone y publica criterios actuales al servicio */
  updateCriteria() {
    const criteria = {
      checkin: this.checkinDate,
      checkout: this.checkoutDate,
      adults: this.adults,
      children: this.children,
      rooms: this.rooms,
      pets: this.hasPets
    };
    this.searchService.setCriteria(criteria);
  }

  openCheckin() {
    // toggle: if already active close it, otherwise open
    if (this.activePicker === 'checkin') {
      this.closePickers();
      return;
    }
    // open checkin and ensure any other active panel is closed
    this.activePicker = 'checkin';
    // on small screens we show an inline expanded panel instead of the popover
    if (window.innerWidth && window.innerWidth <= 420) return;
    try { this.checkinPicker?.open(); } catch (e) { /* fallback */ }
  }

  openCheckout() {
    // toggle: if already active close it, otherwise open
    if (this.activePicker === 'checkout') {
      this.closePickers();
      return;
    }
    this.activePicker = 'checkout';
    // on small screens show inline panel instead of popover
    if (window.innerWidth && window.innerWidth <= 420) return;
    try { this.checkoutPicker?.open(); } catch (e) { /* fallback */ }
  }

  closePickers() {
    this.activePicker = null;
  }

  openAdultSelect() {
    // close any expanded inline panel when opening native selects
    this.closePickers();
    try { this.adultSelect?.open(); } catch (e) { /* fallback */ }
  }

  openChildSelect() {
    this.closePickers();
    try { this.childSelect?.open(); } catch (e) { /* fallback */ }
  }

  openRoomSelect() {
    this.closePickers();
    try { this.roomSelect?.open(); } catch (e) { /* fallback */ }
  }

  // openPetSelect removed: no longer needed for toggle-based UI

  toggleText() {
    this.showText = !this.showText;
  }

  addComment() {
    if (!this.newComment.name || !this.newComment.text) return;
    const c = { name: this.newComment.name, text: this.newComment.text, rating: this.newComment.rating, date: new Date() };
    this.comments.unshift(c);
    this.newComment = { name: '', text: '', rating: 5 };
  }

  getStars(r: number) {
    const full = '★'.repeat(r || 0);
    const empty = '☆'.repeat(Math.max(0, 5 - (r || 0)));
    return full + empty;
  }

  async openPhoto(src: string) {
    const modal = await this.modalCtrl.create({
      component: PhotoModalComponent,
      componentProps: { src },
      cssClass: 'photo-modal'
    });
    await modal.present();
  }

  ngAfterViewInit(): void {
    // Wait a tick so the QueryList is populated and layout is stable
    setTimeout(() => {
      this.albumContainers.forEach((ref) => {
        const container = ref.nativeElement as HTMLElement;
        if (!container) return;

        const items = Array.from(container.querySelectorAll('.album-item')) as HTMLElement[];
        const total = items.length || 0;
        this.totalSlidesMap.set(container, total);
        this.currentIndexMap.set(container, 0);
        this.isPausedMap.set(container, false);

        // set initial active slide
        this.setActiveFor(container, 0);

        // attach interaction listeners to pause/resume when user interacts
        const down = () => this.stopAutoScroll(container);
        const up = () => this.startAutoScroll(container);
        const enter = () => this.stopAutoScroll(container);
        const leave = () => this.startAutoScroll(container);

        container.addEventListener('pointerdown', down, { passive: true });
        container.addEventListener('pointerup', up, { passive: true });
        container.addEventListener('pointerenter', enter, { passive: true });
        container.addEventListener('pointerleave', leave, { passive: true });

        this.listenersMap.set(container, { down, up, enter, leave });

        // start automatic sliding for this container
        this.startAutoScroll(container);
      });
    }, 300);
  }

  public nextSlide(containerParam?: ElementRef<HTMLDivElement> | HTMLElement, skipAnimation = false) {
    const container = this.normalizeContainer(containerParam);
    if (!container) return;

    const total = this.totalSlidesMap.get(container) || 0;
    if (total === 0) return;

    const slideWidth = container.clientWidth;
    const current = this.currentIndexMap.get(container) || 0;
    const nextIndex = (current + 1) % total;
    const left = nextIndex * slideWidth;
    const startLeft = container.scrollLeft;

    // if wrapping to first slide, always jump immediately (no animation)
    if (skipAnimation || nextIndex === 0) {
      // cancel any ongoing scroll animation for this container
      const prevRaf = this.rafMap.get(container);
      if (prevRaf) {
        cancelAnimationFrame(prevRaf);
        this.rafMap.delete(container);
      }
      this.setActiveFor(container, nextIndex);
      container.scrollLeft = left;
      this.currentIndexMap.set(container, nextIndex);
      return;
    }

    this.setActiveFor(container, nextIndex);
    this.currentIndexMap.set(container, nextIndex);
    if (skipAnimation) {
      const prevRaf = this.rafMap.get(container);
      if (prevRaf) {
        cancelAnimationFrame(prevRaf);
        this.rafMap.delete(container);
      }
      container.scrollLeft = left;
      return;
    }
    this.animateScrollTo(container, left, 3600);
  }

  public prevSlide(containerParam?: ElementRef<HTMLDivElement> | HTMLElement, skipAnimation = false) {
    const container = this.normalizeContainer(containerParam);
    if (!container) return;

    const total = this.totalSlidesMap.get(container) || 0;
    if (total === 0) return;

    const slideWidth = container.clientWidth;
    const current = this.currentIndexMap.get(container) || 0;
    const prevIndex = (current - 1 + total) % total;
    const left = prevIndex * slideWidth;
    const startLeft = container.scrollLeft;

    // if wrapping from first->last, jump immediately (no animation)
    if (skipAnimation || (prevIndex === total - 1 && current === 0)) {
      const prevRaf = this.rafMap.get(container);
      if (prevRaf) {
        cancelAnimationFrame(prevRaf);
        this.rafMap.delete(container);
      }
      this.setActiveFor(container, prevIndex);
      container.scrollLeft = left;
      this.currentIndexMap.set(container, prevIndex);
      return;
    }

    this.setActiveFor(container, prevIndex);
    this.currentIndexMap.set(container, prevIndex);
    if (skipAnimation) {
      const prevRaf = this.rafMap.get(container);
      if (prevRaf) {
        cancelAnimationFrame(prevRaf);
        this.rafMap.delete(container);
      }
      container.scrollLeft = left;
      return;
    }
    this.animateScrollTo(container, left, 3600);
  }

  // helper: find the album container corresponding to a button click event
  private findContainerFromEvent(ev: Event): HTMLElement | null {
    const btn = ev.currentTarget as HTMLElement | null;
    if (!btn) return null;
    const wrapper = btn.closest('.album-wrapper') as HTMLElement | null;
    if (!wrapper) return null;
    return wrapper.querySelector('.album-container') as HTMLElement | null;
  }

  public nextSlideFromEvent(ev: Event, skipAnimation = false) {
    const container = this.findContainerFromEvent(ev);
    if (!container) return;
    this.nextSlide(container, skipAnimation);
  }

  public prevSlideFromEvent(ev: Event, skipAnimation = false) {
    const container = this.findContainerFromEvent(ev);
    if (!container) return;
    this.prevSlide(container, skipAnimation);
  }

  private animateScrollTo(container: HTMLElement, targetLeft: number, duration = 900) {
    // cancel any previous animation for this container
    const prev = this.rafMap.get(container);
    if (prev) {
      cancelAnimationFrame(prev);
      this.rafMap.delete(container);
    }

    const startLeft = container.scrollLeft;
    const change = targetLeft - startLeft;
    const startTime = performance.now();

    const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const val = easeInOutQuad(t);
      container.scrollLeft = Math.round(startLeft + change * val);
      if (t < 1) {
        const id = requestAnimationFrame(step);
        this.rafMap.set(container, id);
      } else {
        // finished
        const id = this.rafMap.get(container);
        if (id) this.rafMap.delete(container);
      }
    };

    const id = requestAnimationFrame(step);
    this.rafMap.set(container, id);
  }

  private startAutoScroll(containerParam?: ElementRef<HTMLDivElement> | HTMLElement) {
    const container = this.normalizeContainer(containerParam);
    if (!container) return;

    const total = this.totalSlidesMap.get(container) || 0;
    if (total <= 1) return;
    if (this.intervalMap.has(container)) return; // already running

    this.isPausedMap.set(container, false);
    const id = setInterval(() => {
      if (!this.isPausedMap.get(container)) this.nextSlide(container);
    }, 4000);
    this.intervalMap.set(container, id);
  }

  private stopAutoScroll(containerParam?: ElementRef<HTMLDivElement> | HTMLElement) {
    const container = this.normalizeContainer(containerParam);
    if (!container) return;

    this.isPausedMap.set(container, true);
    const id = this.intervalMap.get(container);
    if (id) {
      clearInterval(id);
      this.intervalMap.delete(container);
    }
  }

  ngOnDestroy(): void {
    // remove listeners and clear intervals for all containers
    this.listenersMap.forEach((listeners, container) => {
      container.removeEventListener('pointerdown', listeners.down);
      container.removeEventListener('pointerup', listeners.up);
      container.removeEventListener('pointerenter', listeners.enter);
      container.removeEventListener('pointerleave', listeners.leave);
    });
    this.intervalMap.forEach((id) => clearInterval(id));
    this.intervalMap.clear();
    this.listenersMap.clear();
    this.currentIndexMap.clear();
    this.totalSlidesMap.clear();
    this.isPausedMap.clear();
  }

  private setActiveFor(container: HTMLElement, index: number) {
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.album-item')) as HTMLElement[];
    items.forEach((it, i) => {
      if (i === index) it.classList.add('active');
      else it.classList.remove('active');
    });
  }

  private normalizeContainer(containerParam?: ElementRef<HTMLDivElement> | HTMLElement): HTMLElement | null {
    if (!containerParam) return null;
    // template ref passes HTMLElement, but ViewChildren gives ElementRef
    if ((containerParam as ElementRef).nativeElement) return (containerParam as ElementRef).nativeElement as HTMLElement;
    return containerParam as HTMLElement;
  }
}

