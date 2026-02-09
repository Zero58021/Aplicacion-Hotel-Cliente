import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhotoModalComponent } from '../photo-modal/photo-modal.component';

interface Review { name: string; rating: number; comment: string; date: string }

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './room-detail.component.html',
  styleUrls: ['./room-detail.component.scss']
})
export class RoomDetailComponent implements OnInit {
  @Input() room: any;
  @ViewChild('rdBody', { read: ElementRef }) rdBody?: ElementRef<HTMLElement>;

  reviews: Review[] = [];

  // model for new review
  newName = '';
  newRating = 5;
  newComment = '';

  showScrollTop = false;
  private lastScrollTop = 0;
  private scrollListener?: any;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  ngAfterViewInit(): void {
    // attach scroll listener to inner body if available
    if (this.rdBody && this.rdBody.nativeElement) {
      const el = this.rdBody.nativeElement;
      this.scrollListener = (ev: Event) => this.onBodyScroll(ev as UIEvent);
      el.addEventListener('scroll', this.scrollListener, { passive: true });
    }
  }

  ngOnDestroy(): void {
    if (this.rdBody && this.scrollListener) {
      this.rdBody.nativeElement.removeEventListener('scroll', this.scrollListener);
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  private storageKey() {
    return `roomReviews_tab2_${this.room?.id ?? 'unknown'}`;
  }

  loadReviews() {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) { this.reviews = []; return; }
      this.reviews = JSON.parse(raw) as Review[];
    } catch (e) {
      console.warn('No se pudieron cargar las opiniones', e);
      this.reviews = [];
    }
  }

  saveReviews() {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.reviews));
    } catch (e) {
      console.warn('No se pudieron guardar las opiniones', e);
    }
  }

  addReview() {
    if (!this.newName || !this.newComment) return;
    const r: Review = { name: this.newName, rating: Math.max(1, Math.min(5, Number(this.newRating) || 5)), comment: this.newComment, date: new Date().toISOString() };
    this.reviews.unshift(r);
    this.saveReviews();
    this.newName = '';
    this.newRating = 5;
    this.newComment = '';
  }

  private onBodyScroll(ev: UIEvent) {
    const target = ev.target as HTMLElement;
    if (!target) return;
    const st = target.scrollTop || 0;
    // show scroll-to-top when scrolled down more than 150px
    this.showScrollTop = st > 150;
    this.lastScrollTop = st;
  }

  scrollToTop() {
    const el = this.rdBody?.nativeElement;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async openPhoto(src: string | null) {
    if (!src) return;
    const modal = await this.modalCtrl.create({
      component: PhotoModalComponent,
      componentProps: { src },
      cssClass: 'photo-modal'
    });
    await modal.present();
  }
}
