import { Component, Input, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhotoModalComponent } from '../photo-modal/photo-modal.component';
import { ApiService } from '../services/api'; // <--- IMPORTANTE: Importamos tu servicio

// Adaptamos la interfaz para que coincida con tu db.json (usuario, texto, fecha)
interface Review { name: string; rating: number; comment: string; date: string }

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './room-detail.component.html',
  styleUrls: ['./room-detail.component.scss']
})
export class RoomDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() room: any;
  @ViewChild('rdBody', { read: ElementRef }) rdBody?: ElementRef<HTMLElement>;

  reviews: Review[] = [];

  newName = '';
  newRating = 5;
  newComment = '';

  showScrollTop = false;
  private lastScrollTop = 0;
  private scrollListener?: any;

  // Inyectamos ApiService
  constructor(private modalCtrl: ModalController, private api: ApiService) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  ngAfterViewInit(): void {
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

  // Ahora loadReviews lee directamente del objeto 'room' que viene del servidor
  loadReviews() {
    if (this.room && this.room.comentarios) {
      // Mapeamos los campos del servidor (usuario, texto) a los de tu componente (name, comment)
      this.reviews = this.room.comentarios.map((c: any) => ({
        name: c.usuario,
        rating: c.rating,
        comment: c.texto,
        date: c.fecha
      })).reverse(); // Las más nuevas primero
    } else {
      this.reviews = [];
    }
  }

  // --- NUEVA LÓGICA DE GUARDADO EN SERVIDOR ---
  addReview() {
    if (!this.newName || !this.newComment) return;

    // 1. Creamos el nuevo comentario con el formato de tu db.json
    const nuevoComentarioServidor = {
      usuario: this.newName,
      rating: Math.max(1, Math.min(5, Number(this.newRating) || 5)),
      texto: this.newComment,
      fecha: new Date().toISOString()
    };

    // 2. Preparamos el array completo para enviar al servidor
    // Cogemos lo que ya había en la habitación y añadimos el nuevo
    const comentariosActualizados = [...(this.room.comentarios || []), nuevoComentarioServidor];

    // 3. Llamamos a la API para actualizar la habitación en el servidor
    this.api.actualizarHabitacion(this.room.id, { comentarios: comentariosActualizados }).subscribe({
      next: () => {
        // Actualizamos la vista local
        this.room.comentarios = comentariosActualizados;
        this.loadReviews();
        
        // Limpiamos el formulario
        this.newName = '';
        this.newRating = 5;
        this.newComment = '';
      },
      error: (err: any) => console.error('Error al guardar la opinión en el servidor', err)
    });
  }

  // Mantenemos tus funciones de scroll y fotos intactas
  private onBodyScroll(ev: UIEvent) {
    const target = ev.target as HTMLElement;
    if (!target) return;
    const st = target.scrollTop || 0;
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