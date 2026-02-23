import { Component, OnInit, OnDestroy, AfterViewInit, ViewChildren, ViewChild, QueryList, ElementRef } from '@angular/core';
import { ModalController, IonContent } from '@ionic/angular';
import { PhotoModalComponent } from '../photo-modal/photo-modal.component';
import { RoomDetailComponent } from '../room-detail/room-detail.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchCriteria } from '../services/search.service';
import { SelectionService } from '../services/selection.service';
import { ApiService } from '../services/api'; 
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab2',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
})
export class Tab2Page implements OnInit, OnDestroy, AfterViewInit {
  criteria: SearchCriteria | null = null;
  private sub?: Subscription;
  
  roomTypes = ['Individual', 'Doble', 'Doble individual', 'Triple', 'Suite', 'Familiar'];
  floors = ['Cualquiera', 'Baja', 'Primera', 'Segunda', 'Tercera', 'Cuarta'];
  amenitiesOptions = ['Balcón', 'Bañera', 'Cuna', 'Ducha', 'Frigorífico', 'Televisión', 'Terraza', 'WiFi', 'Limpieza', 'Silla de ruedas', 'Toallas extras'];

  selectedRoomType: string | null = null;
  selectedFloor: string | null = null;
  selectedAmenities: string[] = [];
  favoritesFilter: 'all' | 'favorites' = 'all';

  rooms: any[] = [];
  filteredRooms: any[] = [];
  filteredCategories: any[] = [];

  // ==========================================
  // LÓGICA DEL CARRITO
  // ==========================================

  get requestedRooms(): number {
    return this.criteria && this.criteria.rooms ? Number(this.criteria.rooms) : 1;
  }

  get totalSelectedRooms(): number {
    return this.filteredCategories.reduce((sum, c) => sum + (Number(c.selectedQty) || 0), 0);
  }

  get totalSelectedPrice(): number {
    return this.filteredCategories.reduce((sum, c) => sum + (c.price * (Number(c.selectedQty) || 0)), 0);
  }

  getSelectedCategories() {
    return this.filteredCategories.filter(c => (c.selectedQty || 0) > 0);
  }

  scrollToRoom(type: string) {
    const el = document.getElementById('room-card-' + type);
    if (el) {
      // Ajustamos el scroll por el header fijo
      const yOffset = -120; 
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      this.content?.scrollToPoint(0, y, 500);

      el.classList.add('highlight-pulse');
      setTimeout(() => el.classList.remove('highlight-pulse'), 1500);
    }
  }

  increaseQty(category: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    if (!category) return;
    
    const maxPerCategory = category.availableCount || 1;
    const currentQty = Number(category.selectedQty) || 0;
    
    if (currentQty >= maxPerCategory) return;
    if (this.totalSelectedRooms >= this.requestedRooms) return;
    
    category.selectedQty = currentQty + 1;
  }

  decreaseQty(category: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    if (!category) return;
    const currentQty = Number(category.selectedQty) || 0;
    category.selectedQty = Math.max(0, currentQty - 1);
  }

  proceedToCheckout() {
    if (this.totalSelectedRooms !== this.requestedRooms) {
      return;
    }

    const selectedCart = this.filteredCategories
      .filter((c: any) => (c.selectedQty || 0) > 0)
      .map((c: any) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        qty: c.selectedQty,
        price: c.price,
        oldPrice: c.oldPrice,      // <-- Añadido
        photos: c.photos,
        physicalRooms: c.physicalRooms,
        amenities: c.amenities,    // <-- ¡Faltaban los extras!
        rating: c.rating           // <-- ¡Faltaban las estrellas!
      }));

    this.selectionService.setSelectedRoom({ 
      selectedCategories: selectedCart, 
      totalRooms: this.totalSelectedRooms, 
      totalPrice: this.totalSelectedPrice 
    });
    this.router.navigateByUrl('/tabs/tab3');
  }
  // ==========================================

  @ViewChildren('albumContainer') albumContainers!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  showScrollTop = false;

  private intervalMap = new Map<HTMLElement, any>();
  private currentIndexMap = new Map<HTMLElement, number>();
  private totalSlidesMap = new Map<HTMLElement, number>();
  private isPausedMap = new Map<HTMLElement, boolean>();
  private rafMap = new Map<HTMLElement, number>();
  private listenersMap = new Map<HTMLElement, { down: any; up: any; enter: any; leave: any }>();

  constructor(
    private searchService: SearchService, 
    private router: Router, 
    private modalCtrl: ModalController, 
    private selectionService: SelectionService,
    private apiService: ApiService 
  ) { }

  ngOnInit() {
    this.loadRoomsFromServer();

    this.sub = this.searchService.criteria$.subscribe(c => {
      this.criteria = c;
      if (c) {
        this.selectedRoomType = c.roomType ?? null;
        this.selectedFloor = c.floor ?? null;
        this.selectedAmenities = c.amenities ? c.amenities.slice() : [];
      }
      this.applyFilters();
    });
    this.loadFavorites();
  }

  loadRoomsFromServer() {
    this.apiService.getHabitaciones().subscribe({
      next: (data: any[]) => {
        this.rooms = data.map((h: any) => ({
          ...h,
          id: h.id,
          name: h.title || `Habitación ${h.numero}`,
          type: h.tipo,
          floor: h.planta,
          amenities: h.extras || [],
          photos: h.images || [],
          price: h.price,
          oldPrice: h.oldPrice || (h.price + 20),
          comentarios: h.comentarios || [],
          condiciones: h.condiciones || {},
          favorite: false 
        }));

        this.loadFavorites();
        this.computeRatingsFromReviews(); 
        this.applyFilters();

        setTimeout(() => this.ngAfterViewInit(), 500);
      },
      error: (err: any) => console.error('Error cargando habitaciones del servidor', err)
    });
  }

  starsArray(n: number) {
    const count = Math.max(0, Math.round(n || 0));
    return Array.from({ length: count });
  }

  private loadFavorites() {
    try {
      const raw = localStorage.getItem('categoryFavorites');
      const types = raw ? JSON.parse(raw) : [];
      this.filteredCategories.forEach(c => c.favorite = types.includes(c.type));
    } catch (e) {
      console.warn('Error cargando favoritos', e);
    }
  }

  private saveFavorites() {
    try {
      const types = this.filteredCategories.filter(c => c.favorite).map(c => c.type);
      localStorage.setItem('categoryFavorites', JSON.stringify(types));
    } catch (e) {
      console.warn('Error guardando favoritos', e);
    }
  }

  async openPhoto(src: string) {
    const modal = await this.modalCtrl.create({
      component: PhotoModalComponent,
      componentProps: { src },
      cssClass: 'photo-modal'
    });
    await modal.present();
  }

  async openRoomDetails(room: any) {
    const modal = await this.modalCtrl.create({
      component: RoomDetailComponent,
      componentProps: { room },
      cssClass: 'room-detail-modal',
      breakpoints: [0.25, 0.6, 0.95],
      initialBreakpoint: 0.6
    });
    await modal.present();
    modal.onDidDismiss().then(() => this.loadRoomsFromServer());
  }

  computeRatingsFromReviews() {
    this.rooms.forEach(r => {
      if (r.comentarios && r.comentarios.length > 0) {
        const sum = r.comentarios.reduce((acc: number, cur: any) => acc + (Number(cur.rating) || 0), 0);
        r.rating = sum / r.comentarios.length;
      } else {
        r.rating = 0;
      }
    });
    this.applyFilters();
  }

  applyFilters() {
    let nights = 1;
    let checkinDay = new Date().getDate();
    let isCheckinWeekend = false;

    if (this.criteria && this.criteria.checkin && this.criteria.checkout) {
      const inDate = new Date(this.criteria.checkin);
      const outDate = new Date(this.criteria.checkout);
      const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
      nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      checkinDay = inDate.getDate();
      
      const dayOfWeek = inDate.getDay(); 
      isCheckinWeekend = (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6);
    }

    const validRooms = this.rooms.filter(r => {
      if (r.estado && r.estado !== 'Libre') return false;

      const cond = r.condiciones || {};
      if (cond.bloqueadaTemporalmente) return false;
      if (cond.estanciaMinima && nights < cond.estanciaMinima) return false;
      if (cond.soloFinesDeSemana && !isCheckinWeekend) return false;
      if (cond.diasPermitidos === 'Pares' && checkinDay % 2 !== 0) return false;
      if (cond.diasPermitidos === 'Impares' && checkinDay % 2 === 0) return false;

      if (this.selectedRoomType && this.selectedRoomType !== r.type) return false;
      if (this.selectedFloor && this.selectedFloor !== r.floor) return false;
      
      if (this.selectedAmenities && this.selectedAmenities.length) {
        if (this.selectedAmenities.includes('Sin nada')) {
          if (!(r.amenities.length === 0 || (r.amenities.length === 1 && r.amenities[0] === 'Sin nada'))) return false;
        } else {
          for (const a of this.selectedAmenities) {
            if (!r.amenities.includes(a)) return false;
          }
        }
      }

      return true;
    });

    const grouped = new Map<string, any>();
    
    validRooms.forEach(r => {
      if (!grouped.has(r.type)) {
        grouped.set(r.type, {
          id: r.type, 
          type: r.type,
          name: `Habitación ${r.type}`,
          physicalRooms: [],
          price: r.price,
          oldPrice: r.oldPrice,
          photos: [],
          amenitiesSet: new Set(),
          ratingSum: 0,
          ratingCount: 0,
          favorite: false
        });
      }
      
      const group = grouped.get(r.type);
      group.physicalRooms.push(r);
      
      if (r.price < group.price) {
        group.price = r.price;
        group.oldPrice = r.oldPrice;
      }
      
      if (r.photos && r.photos.length) {
        r.photos.forEach((p: string) => {
          if (!group.photos.includes(p)) group.photos.push(p);
        });
      }

      if (r.amenities) {
        r.amenities.forEach((a: string) => group.amenitiesSet.add(a));
      }

      if (r.rating) {
         group.ratingSum += r.rating;
         group.ratingCount++;
      }
    });

    let finalCategories = Array.from(grouped.values()).map(g => {
       return {
         ...g,
         availableCount: g.physicalRooms.length,
         amenities: Array.from(g.amenitiesSet),
         rating: g.ratingCount ? (g.ratingSum / g.ratingCount) : 0,
         selectedQty: 0
       };
    });

    finalCategories = finalCategories.filter(g => g.availableCount > 0);
    this.filteredCategories = finalCategories;

    this.loadFavorites();
    if (this.favoritesFilter === 'favorites') {
      this.filteredCategories = this.filteredCategories.filter((c: any) => c.favorite);
    }
  }

  toggleFavorite(room: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    room.favorite = !room.favorite;
    this.saveFavorites();
    if (this.favoritesFilter === 'favorites') this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
    const base: SearchCriteria = this.searchService.current ?? {
      checkin: null, checkout: null, adults: 2, children: 0, rooms: 1, pets: false
    };
    this.searchService.setCriteria({
      ...base,
      roomType: this.selectedRoomType ?? undefined,
      floor: this.selectedFloor ?? undefined,
      amenities: this.selectedAmenities && this.selectedAmenities.length ? this.selectedAmenities.slice() : undefined
    });
  }

  resetFilters() {
    this.selectedRoomType = null;
    this.selectedFloor = null;
    this.selectedAmenities = [];
    this.onFilterChange();
  }

  goToTab1(ev?: Event) {
    if (ev) ev.stopPropagation();
    this.router.navigateByUrl('/tabs/tab1');
  }

  onScroll(ev: any) {
    const y = ev?.detail?.scrollTop ?? 0;
    this.showScrollTop = y > 300;
  }

  scrollToTop() {
    try { this.content?.scrollToTop(300); } catch (e) { window.scrollTo({ top: 0, behavior: 'smooth' } as any); }
  }

  edit() { this.router.navigateByUrl('/tabs/tab1'); }

  // Sliders
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.albumContainers.forEach((ref) => {
        const container = ref.nativeElement as HTMLElement;
        if (!container) return;
        const items = Array.from(container.querySelectorAll('.album-item')) as HTMLElement[];
        const total = items.length || 0;
        this.totalSlidesMap.set(container, total);
        this.currentIndexMap.set(container, 0);
        this.isPausedMap.set(container, false);
        this.setActiveFor(container, 0);
        const down = () => this.stopAutoScroll(container);
        const up = () => this.startAutoScroll(container);
        const enter = () => this.stopAutoScroll(container);
        const leave = () => this.startAutoScroll(container);
        container.addEventListener('pointerdown', down, { passive: true });
        container.addEventListener('pointerup', up, { passive: true });
        container.addEventListener('pointerenter', enter, { passive: true });
        container.addEventListener('pointerleave', leave, { passive: true });
        this.listenersMap.set(container, { down, up, enter, leave });
        this.startAutoScroll(container);
      });
    }, 300);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.listenersMap.forEach((listeners, container) => {
      container.removeEventListener('pointerdown', listeners.down);
      container.removeEventListener('pointerup', listeners.up);
      container.removeEventListener('pointerenter', listeners.enter);
      container.removeEventListener('pointerleave', listeners.leave);
    });
    this.intervalMap.forEach((id) => clearInterval(id));
    this.intervalMap.clear();
  }

  public nextSlideFromEvent(ev: Event, skipAnimation = false) { const container = this.findContainerFromEvent(ev); if (container) this.nextSlide(container, skipAnimation); }
  public prevSlideFromEvent(ev: Event, skipAnimation = false) { const container = this.findContainerFromEvent(ev); if (container) this.prevSlide(container, skipAnimation); }
  public nextSlide(containerParam?: ElementRef<HTMLDivElement> | HTMLElement, skipAnimation = false) { const container = this.normalizeContainer(containerParam); if (!container) return; const total = this.totalSlidesMap.get(container) || 0; if (total === 0) return; const slideWidth = container.clientWidth; const current = this.currentIndexMap.get(container) || 0; const nextIndex = (current + 1) % total; const left = nextIndex * slideWidth; if (skipAnimation || nextIndex === 0) { const prevRaf = this.rafMap.get(container); if (prevRaf) cancelAnimationFrame(prevRaf); this.setActiveFor(container, nextIndex); container.scrollLeft = left; this.currentIndexMap.set(container, nextIndex); return; } this.setActiveFor(container, nextIndex); this.currentIndexMap.set(container, nextIndex); this.animateScrollTo(container, left, 3600); }
  public prevSlide(containerParam?: ElementRef<HTMLDivElement> | HTMLElement, skipAnimation = false) { const container = this.normalizeContainer(containerParam); if (!container) return; const total = this.totalSlidesMap.get(container) || 0; if (total === 0) return; const slideWidth = container.clientWidth; const current = this.currentIndexMap.get(container) || 0; const prevIndex = (current - 1 + total) % total; const left = prevIndex * slideWidth; if (skipAnimation || (prevIndex === total - 1 && current === 0)) { const prevRaf = this.rafMap.get(container); if (prevRaf) cancelAnimationFrame(prevRaf); this.setActiveFor(container, prevIndex); container.scrollLeft = left; this.currentIndexMap.set(container, prevIndex); return; } this.setActiveFor(container, prevIndex); this.currentIndexMap.set(container, prevIndex); this.animateScrollTo(container, left, 3600); }
  private animateScrollTo(container: HTMLElement, targetLeft: number, duration = 900) { const prev = this.rafMap.get(container); if (prev) cancelAnimationFrame(prev); const startLeft = container.scrollLeft; const change = targetLeft - startLeft; const startTime = performance.now(); const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t); const step = (now: number) => { const elapsed = now - startTime; const t = Math.min(1, elapsed / duration); const val = easeInOutQuad(t); container.scrollLeft = Math.round(startLeft + change * val); if (t < 1) { const id = requestAnimationFrame(step); this.rafMap.set(container, id); } }; const id = requestAnimationFrame(step); this.rafMap.set(container, id); }
  private startAutoScroll(containerParam?: ElementRef<HTMLDivElement> | HTMLElement) { const container = this.normalizeContainer(containerParam); if (!container) return; const total = this.totalSlidesMap.get(container) || 0; if (total <= 1) return; if (this.intervalMap.has(container)) return; this.isPausedMap.set(container, false); const id = setInterval(() => { if (!this.isPausedMap.get(container)) this.nextSlide(container); }, 4000); this.intervalMap.set(container, id); }
  private stopAutoScroll(containerParam?: ElementRef<HTMLDivElement> | HTMLElement) { const container = this.normalizeContainer(containerParam); if (!container) return; this.isPausedMap.set(container, true); const id = this.intervalMap.get(container); if (id) { clearInterval(id); this.intervalMap.delete(container); } }
  private findContainerFromEvent(ev: Event): HTMLElement | null { const btn = ev.currentTarget as HTMLElement | null; if (!btn) return null; const wrapper = btn.closest('.album-wrapper') as HTMLElement | null; if (!wrapper) return null; return wrapper.querySelector('.album-container') as HTMLElement | null; }
  private setActiveFor(container: HTMLElement, index: number) { if (!container) return; const items = Array.from(container.querySelectorAll('.album-item')) as HTMLElement[]; items.forEach((it, i) => { if (i === index) it.classList.add('active'); else it.classList.remove('active'); }); }
  private normalizeContainer(containerParam?: ElementRef<HTMLDivElement> | HTMLElement): HTMLElement | null { if (!containerParam) return null; if ((containerParam as ElementRef).nativeElement) return (containerParam as ElementRef).nativeElement as HTMLElement; return containerParam as HTMLElement; }
}