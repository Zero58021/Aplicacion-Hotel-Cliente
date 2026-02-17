import { Component, Input, OnInit, ViewChild } from '@angular/core'; // Ya no necesitamos ElementRef, AfterViewInit manual
import { IonicModule, ModalController, IonContent } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhotoModalComponent } from '../photo-modal/photo-modal.component';
import { ApiService } from '../services/api';

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
  
  // Obtenemos referencia al ion-content para poder hacer scroll to top
  @ViewChild('content') content?: IonContent;

  reviews: Review[] = [];

  newName = '';
  newRating = 5;
  newComment = '';

  showScrollTop = false;

  constructor(private modalCtrl: ModalController, private api: ApiService) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  close() {
    this.modalCtrl.dismiss();
  }

  loadReviews() {
    if (this.room && this.room.comentarios) {
      this.reviews = this.room.comentarios.map((c: any) => ({
        name: c.usuario,
        rating: c.rating,
        comment: c.texto,
        date: c.fecha
      })).reverse();
    } else {
      this.reviews = [];
    }
  }

  addReview() {
    if (!this.newName || !this.newComment) return;

    const nuevoComentarioServidor = {
      usuario: this.newName,
      rating: Math.max(1, Math.min(5, Number(this.newRating) || 5)),
      texto: this.newComment,
      fecha: new Date().toISOString()
    };

    const comentariosActualizados = [...(this.room.comentarios || []), nuevoComentarioServidor];

    this.api.actualizarHabitacion(this.room.id, { comentarios: comentariosActualizados }).subscribe({
      next: () => {
        this.room.comentarios = comentariosActualizados;
        this.loadReviews();
        this.newName = '';
        this.newRating = 5;
        this.newComment = '';
        
        // Opcional: Hacer scroll hasta las reviews
        // this.content?.scrollToBottom(300);
      },
      error: (err: any) => console.error('Error al guardar la opinión', err)
    });
  }

  // Evento nativo de Ionic para el scroll
  onContentScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.showScrollTop = scrollTop > 300;
  }

  scrollToTop() {
    this.content?.scrollToTop(500); // 500ms de animación
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