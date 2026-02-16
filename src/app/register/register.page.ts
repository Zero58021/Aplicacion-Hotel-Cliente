import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {

  // Modelo de datos para el nuevo usuario
  newClient = {
    nombre: '',
    usuario: '',
    password: '',
    email: '',
    telefono: '',
    dni: ''
  };

  constructor(
    private api: ApiService, 
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
  }

  async onRegister() {
    // 1. Validar campos vacíos
    if (!this.newClient.nombre || !this.newClient.usuario || !this.newClient.password || !this.newClient.email) {
      this.showToast('Por favor, rellena los campos obligatorios (*)', 'warning');
      return;
    }

    // 2. Comprobar si ya existe el usuario o email
    this.api.getClientes().subscribe(async (clientes: any[]) => {
      const existe = clientes.find((c: any) => 
        c.usuario.toLowerCase() === this.newClient.usuario.toLowerCase() || 
        c.email.toLowerCase() === this.newClient.email.toLowerCase()
      );

      if (existe) {
        this.showAlert('Error', 'El usuario o el correo electrónico ya están registrados.');
      } else {
        // 3. Guardar en base de datos
        this.crearUsuario();
      }
    });
  }

  crearUsuario() {
    this.api.registrarCliente(this.newClient).subscribe({
      next: async () => {
        await this.showToast('¡Registro completado! Ahora puedes iniciar sesión.', 'success');
        this.router.navigate(['/login']); // Volver al login
      },
      error: (err: any) => {
        console.error(err);
        this.showToast('Error al conectar con el servidor', 'danger');
      }
    });
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}