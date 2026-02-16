import { Component } from '@angular/core';
import { IonicModule, PopoverController, IonItem, IonLabel, IonButtons } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [IonicModule, CommonModule],
  selector: 'app-user-menu',
  template: `
    <ion-list>
      <ion-item button (click)="edit()">
        <ion-label>Editar perfil</ion-label>
      </ion-item>
    </ion-list>
  `
})
export class UserMenuComponent {
  constructor(private popover: PopoverController) {}

  async edit() {
    await this.popover.dismiss({ action: 'edit' });
  }
}
