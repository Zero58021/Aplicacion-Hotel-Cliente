import { Component } from '@angular/core';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api'; // Asegúrate de que la ruta es correcta

@Component({
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  selector: 'app-user-profile-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Editar perfil</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding profile-modal-content">
      <div class="profile-top">
        <div class="profile-avatar">{{ model.usuario?.charAt(0) | uppercase }}</div>
        <h2 class="profile-name">{{ model.nombre || model.usuario }}</h2>
        <p class="profile-email">{{ model.email }}</p>
      </div>

      <form (ngSubmit)="save()">
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Nombre completo</ion-label>
            <ion-input [(ngModel)]="model.nombre" name="nombre"></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Usuario</ion-label>
            <ion-input [(ngModel)]="model.usuario" name="usuario"></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Email</ion-label>
            <ion-input type="email" [(ngModel)]="model.email" name="email"></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Contraseña actual</ion-label>
            <ion-input [type]="showCurrent ? 'text' : 'password'" [(ngModel)]="currentPassword" name="currentPassword"></ion-input>
            <ion-button fill="clear" slot="end" (click)="showCurrent = !showCurrent">
              <ion-icon [name]="showCurrent ? 'eye-off' : 'eye'"></ion-icon>
            </ion-button>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Nueva contraseña</ion-label>
            <ion-input [type]="showNew ? 'text' : 'password'" [(ngModel)]="newPassword" name="newPassword"></ion-input>
            <ion-button fill="clear" slot="end" (click)="showNew = !showNew">
              <ion-icon [name]="showNew ? 'eye-off' : 'eye'"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>

        <div class="actions">
          <ion-button fill="clear" (click)="close()">Cancelar</ion-button>
          <ion-button type="submit" color="primary" fill="solid" class="save-btn">Guardar cambios</ion-button>
        </div>
      </form>
    </ion-content>
  `,
  styles: [
    `
      .profile-modal-content { --padding-top: 18px; --padding-bottom: 24px; }
      .profile-top { display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom: 12px; }
      .profile-avatar { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:800; color:#fff; background: linear-gradient(135deg,#66bb6a,#1b5e20); box-shadow: 0 6px 18px rgba(27,94,32,0.18); margin: 6px 0 8px; }
      .profile-name { margin: 0; font-size:18px; font-weight:700; color:#083712; }
      .profile-email { margin:4px 0 0; font-size:13px; color:#557b5a; }
      ion-list { margin-top: 8px; }
      ion-item { --inner-padding-end: 12px; --inner-padding-start: 12px; }
      .actions { margin-top: 18px; display:flex; gap:8px; justify-content:flex-end; align-items:center; }
      .save-btn { --color: #ffffff; --background: var(--ion-color-primary); min-width:140px; }
      @media (max-width: 420px) {
        .actions { flex-direction: column-reverse; }
        .save-btn { width:100%; }
        .actions ion-button.fill-clear { width:100%; }
      }
    `
  ]
})
export class UserProfileModalComponent {
  model: any = {};
  showCurrent = false;
  showNew = false;
  currentPassword = '';
  newPassword = '';
  private originalUser: any = null;

  constructor(
    private modalCtrl: ModalController, 
    private auth: AuthService, 
    private alertCtrl: AlertController, 
    private api: ApiService
  ) {
    const u = this.auth.getUser();
    if (u) {
      // Hacemos copia para no modificar el original hasta guardar
      this.model = { ...u };
      this.originalUser = u;
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async save() {
    // 1. Preparamos el objeto a enviar
    const userToSend = { ...this.model };

    // 2. Gestión de contraseña
    if (this.newPassword) {
      // Validar que haya introducido la actual
      if (!this.currentPassword) {
        const a = await this.alertCtrl.create({ 
          header: 'Falta contraseña', 
          message: 'Debes introducir la contraseña actual para cambiarla.', 
          buttons: ['OK'] 
        });
        await a.present();
        return;
      }

      // Validar que la actual sea correcta
      const originalPass = this.originalUser?.password || '';
      if (String(this.currentPassword) !== String(originalPass)) {
        const a = await this.alertCtrl.create({ 
          header: 'Error', 
          message: 'La contraseña actual no es correcta.', 
          buttons: ['OK'] 
        });
        await a.present();
        return;
      }

      // Si pasa la validación, asignamos la NUEVA
      userToSend.password = this.newPassword;
    } else {
      // Si NO cambia la contraseña, nos aseguramos de enviar la antigua 
      // para que el servidor no la borre o la deje vacía
      userToSend.password = this.originalUser.password;
    }

    // 3. Obtener el ID correctamente (probamos varias opciones comunes)
    const id = userToSend.id || userToSend._id || userToSend.idCliente || this.originalUser.id;

    if (!id) {
      console.error('Error: No se encuentra el ID del usuario', userToSend);
      const a = await this.alertCtrl.create({ header: 'Error', message: 'No se pudo identificar al usuario (Falta ID).', buttons: ['OK'] });
      await a.present();
      return;
    }

    console.log('Enviando datos al servidor:', userToSend);

    // 4. Llamada a la API
    this.api.updateCliente(id, userToSend).subscribe({
      next: async (resp) => {
        console.log('Respuesta servidor:', resp);
        
        // Actualizamos la sesión local con los nuevos datos
        this.auth.updateUser(userToSend);

        const a = await this.alertCtrl.create({ 
          header: 'Éxito', 
          message: 'Perfil actualizado correctamente.', 
          buttons: ['OK'] 
        });
        await a.present();

        this.modalCtrl.dismiss({ updated: userToSend, resp });
      },
      error: async (err) => {
        console.error('Error guardando en DB:', err);
        const a = await this.alertCtrl.create({ 
          header: 'Error', 
          message: 'No se pudo conectar con la base de datos.', 
          buttons: ['OK'] 
        });
        await a.present();
      }
    });
  }
}