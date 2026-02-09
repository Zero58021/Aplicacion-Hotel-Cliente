import { Component, OnInit, OnDestroy, AfterViewInit, ViewChildren, ViewChild, QueryList, ElementRef } from '@angular/core';
import { ModalController, IonContent } from '@ionic/angular';
import { PhotoModalComponent } from '../photo-modal/photo-modal.component';
import { RoomDetailComponent } from '../room-detail/room-detail.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchCriteria } from '../services/search.service';
import { SelectionService } from '../services/selection.service';
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
  // Opciones de filtro
  roomTypes = ['Individual', 'Doble', 'Doble individual', 'Triple', 'Suite', 'Familiar'];
  floors = ['Cualquiera', 'Baja', 'Primera', 'Segunda', 'Tercera', 'Cuarta'];
  amenitiesOptions = ['Balcón', 'Bañera', 'Cuna', 'Ducha', 'Frigorífico', 'Televisión', 'Terraza', 'WiFi', 'Limpieza', 'Silla de ruedas', 'Toallas extras'];

  // Selecciones actuales
  selectedRoomType: string | null = null;
  selectedFloor: string | null = null;
  selectedAmenities: string[] = [];
  // filtro de favoritos: 'all' | 'favorites'
  favoritesFilter: 'all' | 'favorites' = 'all';

  // Lista de habitaciones de ejemplo (puedes sustituir por datos reales/servicio)
  // Fuente de datos de habitaciones (vacía por defecto — conecta con tu servicio/API)
  rooms: any[] = [
    { id: 1, name: 'Individual Económica', type: 'Individual', floor: 'Baja', amenities: ['WiFi'], photos: ['assets/fotosInicio/1.webp','assets/fotosInicio/2.jpg'], favorite: false, price: 47, oldPrice: 79, rating: 0},
    { id: 2, name: 'Doble Con Balcón', type: 'Doble', floor: 'Primera', amenities: ['Balcón','Televisión'], photos: ['assets/fotosInicio/2.jpg','assets/fotosInicio/3.jpg'], favorite: false, price: 69, oldPrice: 99, rating: 0},
    { id: 3, name: 'Suite Familiar', type: 'Suite', floor: 'Segunda', amenities: ['Terraza','Frigorífico','Televisión'], photos: ['assets/fotosInicio/3.jpg','assets/fotosInicio/4.jpg'], favorite: false, price: 129, oldPrice: 159, rating: 0},
    { id: 4, name: 'Triple Estándar', type: 'Triple', floor: 'Tercera', amenities: ['Ducha','Cuna','WiFi'], photos: ['assets/fotosInicio/4.jpg','assets/fotosInicio/5.jpg'], favorite: false, price: 89, oldPrice: 119, rating: 0},
    { id: 5, name: 'Doble Individual Superior', type: 'Doble individual', floor: 'Cuarta', amenities: ['Bañera','Televisión'], photos: ['assets/fotosInicio/5.jpg','assets/fotosInicio/1.webp'], favorite: false, price: 79, oldPrice: 109, rating: 0},
    { id: 6, name: 'Familiar Plus', type: 'Familiar', floor: 'Primera', amenities: ['Terraza','Balcón','Frigorífico'], photos: ['assets/fotosInicio/1.webp','assets/fotosInicio/3.jpg'], favorite: false, price: 139, oldPrice: 179, rating: 0},
    { id: 7, name: 'Individual Con Terraza', type: 'Individual', floor: 'Segunda', amenities: ['Terraza','WiFi'], photos: ['assets/fotosInicio/2.jpg'], favorite: false, price: 59, oldPrice: 79, rating: 0},
    { id: 8, name: 'Suite Junior', type: 'Suite', floor: 'Tercera', amenities: ['Balcón','Televisión','Frigorífico'], photos: ['assets/fotosInicio/3.jpg'], favorite: false, price: 119, oldPrice: 149, rating: 0},
    { id: 9, name: 'Doble Económica', type: 'Doble', floor: 'Baja', amenities: ['Ducha','WiFi'], photos: ['assets/fotosInicio/4.jpg'], favorite: false, price: 49, oldPrice: 69, rating: 0},
    { id: 10, name: 'Familiar Estándar', type: 'Familiar', floor: 'Cuarta', amenities: ['Cuna','Frigorífico'], photos: ['assets/fotosInicio/5.jpg','assets/fotosInicio/2.jpg'], favorite: false, price: 99, oldPrice: 129, rating: 0 }
  ];

  filteredRooms = this.rooms.slice();
  @ViewChildren('albumContainer') albumContainers!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChild(IonContent) content!: IonContent;

  // Mostrar/ocultar botón para volver arriba
  showScrollTop = false;

  // per-container state maps (copied from Tab1 for identical album behaviour)
  private intervalMap = new Map<HTMLElement, any>();
  private currentIndexMap = new Map<HTMLElement, number>();
  private totalSlidesMap = new Map<HTMLElement, number>();
  private isPausedMap = new Map<HTMLElement, boolean>();
  private rafMap = new Map<HTMLElement, number>();
  private listenersMap = new Map<HTMLElement, { down: any; up: any; enter: any; leave: any }>();

  constructor(private searchService: SearchService, private router: Router, private modalCtrl: ModalController, private selectionService: SelectionService) { }

  ngOnInit() {
    this.sub = this.searchService.criteria$.subscribe(c => {
      this.criteria = c;
      // si ya hay filtros en criterios, sincronizarlos
      if (c) {
        this.selectedRoomType = c.roomType ?? null;
        this.selectedFloor = c.floor ?? null;
        this.selectedAmenities = c.amenities ? c.amenities.slice() : [];
      }
      this.applyFilters();
    });
    // cargar favoritos guardados
    this.loadFavorites();
    // calcular valoraciones a partir de opiniones guardadas
    this.computeRatingsFromReviews();
  }

  starsArray(n: number) {
    const count = Math.max(0, Math.round(n || 0));
    return Array.from({ length: count });
  }

  private loadFavorites() {
    try {
      const raw = localStorage.getItem('roomFavorites');
      if (!raw) return;
      const ids: number[] = JSON.parse(raw);
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
    // cuando se cierre el modal, recalcular valoraciones por si se añadió una opinión
    modal.onDidDismiss().then(() => this.computeRatingsFromReviews());
  }

  // Construye la key usada en RoomDetailComponent para almacenar las opiniones
  private reviewsStorageKeyFor(roomId: number | string) {
    return `roomReviews_tab2_${roomId}`;
  }

  // Lee las opiniones de localStorage y calcula la media para cada habitación
  computeRatingsFromReviews() {
    this.rooms.forEach(r => {
      try {
        const raw = localStorage.getItem(this.reviewsStorageKeyFor(r.id));
        if (!raw) return; // no hay opiniones, dejamos la rating actual
        const reviews = JSON.parse(raw) as Array<{ rating: number }>;
        if (!Array.isArray(reviews) || reviews.length === 0) return;
        const sum = reviews.reduce((acc, cur) => acc + (Number(cur.rating) || 0), 0);
        const avg = sum / reviews.length;
        r.rating = avg; // almacenamos la media (puede ser decimal)
      } catch (e) {
        console.warn('No se pudieron leer las opiniones para la habitación', r.id, e);
      }
    });
    // si hay filtros aplicados, volver a filtrar para reflejar cambios
    this.applyFilters();
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    // remove listeners and clear intervals for all album containers
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

  edit() {
    this.router.navigateByUrl('/tabs/tab1');
  }

  applyFilters() {
    this.filteredRooms = this.rooms.filter(r => {
      if (this.selectedRoomType && this.selectedRoomType !== r.type) return false;
      if (this.selectedFloor && this.selectedFloor !== r.floor) return false;
      if (this.selectedAmenities && this.selectedAmenities.length) {
        // If 'Sin nada' selected, treat as rooms that only have 'Sin nada' or no amenities
        if (this.selectedAmenities.includes('Sin nada')) {
          if (!(r.amenities.length === 0 || (r.amenities.length === 1 && r.amenities[0] === 'Sin nada'))) return false;
        } else {
          // all selected amenities must be present in room
          for (const a of this.selectedAmenities) {
            if (!r.amenities.includes(a)) return false;
          }
        }
      }
      // favorites filter
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
      checkin: null,
      checkout: null,
      adults: 2,
      children: 0,
      rooms: 1,
      pets: false
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

  // Maneja el evento de scroll del IonContent para mostrar/ocultar el botón
  onScroll(ev: any) {
    const y = ev?.detail?.scrollTop ?? 0;
    this.showScrollTop = y > 300;
  }

  // Scroll suave hacia arriba
  scrollToTop() {
    try {
      this.content?.scrollToTop(300);
    } catch (e) {
      // fallback: usar window
      window.scrollTo({ top: 0, behavior: 'smooth' } as any);
    }
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
      if (prevRaf) { cancelAnimationFrame(prevRaf); this.rafMap.delete(container); }
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
      if (prevRaf) { cancelAnimationFrame(prevRaf); this.rafMap.delete(container); }
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
    if (prev) { cancelAnimationFrame(prev); this.rafMap.delete(container); }

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
    if (this.intervalMap.has(container)) return;

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
