import { Component, OnInit, OnDestroy, AfterViewInit, ViewChildren, ViewChild, QueryList, ElementRef } from '@angular/core';
import { ModalController, IonContent } from '@ionic/angular';
import { PhotoModalComponent } from '../photo-modal/photo-modal.component';
import { RoomDetailComponent } from '../room-detail/room-detail.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchCriteria } from '../services/search.service';
import { SelectionService } from '../services/selection.service';
import { ApiService } from '../services/api'; // <--- Mantenemos tu import
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
  
  @ViewChildren('albumContainer') albumContainers!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChild(IonContent) content!: IonContent;

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
          comentarios: h.comentarios || [], // <--- Sincronizamos comentarios del servidor
          favorite: false 
        }));

        this.loadFavorites();
        this.computeRatingsFromReviews(); // Calcula la media usando datos del servidor
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
      const raw = localStorage.getItem('roomFavorites');
      if (!raw) return;
      const ids: any[] = JSON.parse(raw);
      this.rooms.forEach(r => r.favorite = ids.includes(r.id));
    } catch (e) {
      console.warn('No se pudieron cargar los favoritos', e);
    }
  }

  private saveFavorites() {
    try {
      const ids = this.rooms.filter(r => r.favorite).map(r => r.id);
      localStorage.setItem('roomFavorites', JSON.stringify(ids));
    } catch (e) {
      console.warn('No se pudieron guardar los favoritos', e);
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
    // Al cerrar, refrescamos habitaciones para ver nuevas opiniones subidas al servidor
    modal.onDidDismiss().then(() => this.loadRoomsFromServer());
  }

  // --- LOGICA SINCRONIZADA DE OPINIONES ---
  computeRatingsFromReviews() {
    this.rooms.forEach(r => {
      // Usamos el array de comentarios que viene del servidor (h.comentarios)
      if (r.comentarios && r.comentarios.length > 0) {
        const sum = r.comentarios.reduce((acc: number, cur: any) => acc + (Number(cur.rating) || 0), 0);
        r.rating = sum / r.comentarios.length;
      } else {
        r.rating = 0;
      }
    });
    this.applyFilters();
  }

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

  edit() { this.router.navigateByUrl('/tabs/tab1'); }

  applyFilters() {
    this.filteredRooms = this.rooms.filter(r => {
      if (r.estado && r.estado !== 'Libre') return false; 
      
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
      if (this.favoritesFilter === 'favorites' && !r.favorite) return false;
      return true;
    });
  }

  toggleFavorite(room: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    room.favorite = !room.favorite;
    this.saveFavorites();
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

  selectRoom(room: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    this.selectionService.setSelectedRoom(room);
    this.router.navigateByUrl('/tabs/tab3');
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

  public nextSlideFromEvent(ev: Event, skipAnimation = false) {
    const container = this.findContainerFromEvent(ev);
    if (container) this.nextSlide(container, skipAnimation);
  }

  public prevSlideFromEvent(ev: Event, skipAnimation = false) {
    const container = this.findContainerFromEvent(ev);
    if (container) this.prevSlide(container, skipAnimation);
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
    if (skipAnimation || nextIndex === 0) {
      const prevRaf = this.rafMap.get(container);
      if (prevRaf) cancelAnimationFrame(prevRaf);
      this.setActiveFor(container, nextIndex);
      container.scrollLeft = left;
      this.currentIndexMap.set(container, nextIndex);
      return;
    }
    this.setActiveFor(container, nextIndex);
    this.currentIndexMap.set(container, nextIndex);
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
    if (skipAnimation || (prevIndex === total - 1 && current === 0)) {
      const prevRaf = this.rafMap.get(container);
      if (prevRaf) cancelAnimationFrame(prevRaf);
      this.setActiveFor(container, prevIndex);
      container.scrollLeft = left;
      this.currentIndexMap.set(container, prevIndex);
      return;
    }
    this.setActiveFor(container, prevIndex);
    this.currentIndexMap.set(container, prevIndex);
    this.animateScrollTo(container, left, 3600);
  }

  private animateScrollTo(container: HTMLElement, targetLeft: number, duration = 900) {
    const prev = this.rafMap.get(container);
    if (prev) cancelAnimationFrame(prev);
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
    if (this.intervalMap.has(container)) return;
    this.isPausedMap.set(container, false);
    const id = setInterval(() => { if (!this.isPausedMap.get(container)) this.nextSlide(container); }, 4000);
    this.intervalMap.set(container, id);
  }

  private stopAutoScroll(containerParam?: ElementRef<HTMLDivElement> | HTMLElement) {
    const container = this.normalizeContainer(containerParam);
    if (!container) return;
    this.isPausedMap.set(container, true);
    const id = this.intervalMap.get(container);
    if (id) { clearInterval(id); this.intervalMap.delete(container); }
  }

  private findContainerFromEvent(ev: Event): HTMLElement | null {
    const btn = ev.currentTarget as HTMLElement | null;
    if (!btn) return null;
    const wrapper = btn.closest('.album-wrapper') as HTMLElement | null;
    if (!wrapper) return null;
    return wrapper.querySelector('.album-container') as HTMLElement | null;
  }

  private setActiveFor(container: HTMLElement, index: number) {
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.album-item')) as HTMLElement[];
    items.forEach((it, i) => { if (i === index) it.classList.add('active'); else it.classList.remove('active'); });
  }

  private normalizeContainer(containerParam?: ElementRef<HTMLDivElement> | HTMLElement): HTMLElement | null {
    if (!containerParam) return null;
    if ((containerParam as ElementRef).nativeElement) return (containerParam as ElementRef).nativeElement as HTMLElement;
    return containerParam as HTMLElement;
  }
}