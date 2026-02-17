import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {

  // Modelo de datos
  newClient = {
    nombre: '',
    dni: '',
    telefono: '',
    email: '',
    usuario: '',
    password: ''
  };

  loading: boolean = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
  }

  // --- NUEVA FUNCIÓN PARA DAR FORMATO (XXX XX XX XX) ---
  formatPhone(event: any) {
    let value = event.target.value || '';

    // 1. Quitamos todo lo que no sea número
    let number = value.replace(/\D/g, '');

    // 2. Limitamos a 9 dígitos (formato España estándar)
    if (number.length > 9) {
      number = number.substring(0, 9);
    }

    // 3. Aplicamos el formato XXX XX XX XX
    let formatted = '';
    
    if (number.length > 0) {
      formatted = number.substring(0, 3);
    }
    if (number.length > 3) {
      formatted += ' ' + number.substring(3, 5);
    }
    if (number.length > 5) {
      formatted += ' ' + number.substring(5, 7);
    }
    if (number.length > 7) {
      formatted += ' ' + number.substring(7, 9);
    }

    // 4. Actualizamos el modelo y el valor visual del input
    this.newClient.telefono = formatted;
    event.target.value = formatted;
  }

  async onRegister() {
    // Limpieza de espacios en blanco en textos
    this.newClient.email = this.newClient.email.trim();
    this.newClient.usuario = this.newClient.usuario.trim();
    
    // 1. Validar campos vacíos
    // Nota: El teléfono puede tener espacios ahora, así que comprobamos si tiene contenido
    if (!this.newClient.nombre || !this.newClient.usuario || !this.newClient.password || !this.newClient.email || !this.newClient.dni || !this.newClient.telefono) {
      this.showToast('⚠️ Por favor, rellena todos los campos', 'warning');
      return;
    }

    // 2. Validar formato Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newClient.email)) {
      this.showToast('📧 El formato del correo no es válido', 'warning');
      return;
    }

    // 3. Validar Teléfono
    // IMPORTANTE: Limpiamos los espacios que hemos puesto visualmente
    const telefonoLimpio = this.newClient.telefono.replace(/\s/g, ''); 
    
    if (!this.isValidPhone(telefonoLimpio)) {
      this.showToast('📱 El teléfono no es válido (Debe tener 9 dígitos)', 'warning');
      return;
    }
    // Guardamos el teléfono limpio (sin espacios) para enviarlo a la BD
    this.newClient.telefono = telefonoLimpio;

    // 4. Validar DNI / NIE / Pasaporte
    const docLimpio = this.newClient.dni.replace(/[\s-]/g, '').toUpperCase();
    
    if (!this.isValidDNI(docLimpio) && !this.isValidPassport(docLimpio)) {
      this.showToast('🆔 El DNI/NIE o Pasaporte no es válido', 'warning');
      return;
    }
    this.newClient.dni = docLimpio;

    // --- COMIENZA EL PROCESO DE REGISTRO ---
    this.loading = true;

    // 5. Comprobar duplicados
    const duplicado = await this.auth.checkUserExists(
      this.newClient.email, 
      this.newClient.usuario, 
      this.newClient.dni,
      this.newClient.telefono // Enviamos el teléfono limpio
    );

    if (duplicado.exists) {
      this.loading = false;
      let msg = 'Error desconocido';
      if (duplicado.type === 'usuario') msg = '⛔ El nombre de usuario ya está en uso.';
      if (duplicado.type === 'email') msg = '⛔ El correo electrónico ya está registrado.';
      if (duplicado.type === 'dni') msg = '⛔ Ya existe una cuenta con este DNI/Pasaporte.';
      if (duplicado.type === 'telefono') msg = '⛔ Este número de teléfono ya está registrado.';
      
      this.showAlert('Registro Fallido', msg);
      return;
    }

    // 6. Si no existe, procedemos a crear
    this.crearUsuario();
  }

  crearUsuario() {
    this.auth.register(this.newClient).subscribe({
      next: async (res) => {
        this.loading = false;
        await this.showToast('✅ ¡Cuenta creada con éxito!', 'success');
        this.router.navigate(['/login']); 
      },
      error: (err: any) => {
        this.loading = false;
        console.error(err);
        this.showToast('❌ Error al conectar con el servidor', 'danger');
      }
    });
  }

  // --- FUNCIONES DE VALIDACIÓN ---

  private isValidPhone(phone: string): boolean {
    // Regex estricta para 9 dígitos (España)
    // Acepta 6, 7, 8, 9 al principio
    const mobileRegex = /^[6789]\d{8}$/; 
    return mobileRegex.test(phone);
  }

  private isValidDNI(dni: string): boolean {
    const dniRegex = /^\d{8}[A-Z]$/;
    const nieRegex = /^[XYZ]\d{7}[A-Z]$/;

    if (dniRegex.test(dni)) {
      const numero = parseInt(dni.substr(0, 8), 10);
      const letra = dni.substr(8, 1);
      return this.calcularLetraDNI(numero) === letra;
    } 
    
    if (nieRegex.test(dni)) {
      let niePrefix = dni.charAt(0);
      let numeroNie = dni.substr(1, 7);
      
      if (niePrefix === 'X') numeroNie = '0' + numeroNie;
      if (niePrefix === 'Y') numeroNie = '1' + numeroNie;
      if (niePrefix === 'Z') numeroNie = '2' + numeroNie;

      const letra = dni.substr(8, 1);
      return this.calcularLetraDNI(parseInt(numeroNie, 10)) === letra;
    }
    return false;
  }

  private calcularLetraDNI(numero: number): string {
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
    return letras.charAt(numero % 23);
  }

  private isValidPassport(passport: string): boolean {
    const passportRegex = /^[A-Z0-9]{6,12}$/;
    return passportRegex.test(passport);
  }

  // --- HELPERS UI ---

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      color: color,
      position: 'bottom',
      icon: color === 'success' ? 'checkmark-circle' : 'alert-circle'
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