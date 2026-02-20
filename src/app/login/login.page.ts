import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  loginUser: string = '';
  loginPass: string = '';
  errorMsg: string = '';
  showPassword: boolean = false;
  loading: boolean = false;
  shake: boolean = false;
  rememberMe: boolean = false;

  // Variables Easter Egg (Modo Fiesta)
  isPartyMode: boolean = false;
  partyItems: any[] = [];
  private clickCount = 0;
  private clickTimer: any;

  constructor(
    private auth: AuthService, 
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    // Si hay marca de "Recuérdame", entramos directo
    const saved = localStorage.getItem('rememberedUser');
    if (saved === 'true') {
      this.router.navigate(['/tabs/tab1']);
    }
  }

  onLogin() {
    this.errorMsg = '';
    if (!this.loginUser || !this.loginPass) {
      this.errorMsg = 'Por favor, rellena todos los campos';
      this.triggerShake();
      return;
    }

    this.loading = true;
    this.auth.login(this.loginUser, this.loginPass).subscribe((success: boolean) => {
      this.loading = false;
      if (success) {
        this.errorMsg = '';
        
        // Guardar preferencia
        if (this.rememberMe) {
          localStorage.setItem('rememberedUser', 'true');
        } else {
          localStorage.removeItem('rememberedUser');
        }

        this.router.navigate(['/tabs/tab1']);
      } else {
        this.errorMsg = 'Usuario o contraseña incorrectos';
        this.triggerShake();
      }
    }, (err) => {
      this.loading = false;
      this.errorMsg = 'Error de conexión';
      this.triggerShake();
    });
  }

  private triggerShake() {
    this.shake = true;
    setTimeout(() => this.shake = false, 700);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // --- LÓGICA EASTER EGG (5 Clics en el Logo) ---
  onLogoClick() {
    this.clickCount++;
    
    // Reinicia el contador si dejas de hacer clic por 0.5s
    clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => { this.clickCount = 0; }, 500);

    if (this.clickCount >= 5) {
      this.activatePartyMode();
      this.clickCount = 0;
    }
  }

  activatePartyMode() {
    if (this.isPartyMode) return;

    this.ngZone.run(() => {
      console.log('🍹 ¡MODO VACACIONES ACTIVADO!');
      this.isPartyMode = true;
      
      // Emojis de vacaciones
      const icons = ['🍹', '🌊', '☀️', '✈️', '🏨', '🎵', '😎', '🍦', '🌴'];

      // Generar 40 elementos flotantes
      this.partyItems = Array.from({ length: 40 }).map(() => ({
        text: icons[Math.floor(Math.random() * icons.length)],
        left: Math.floor(Math.random() * 100), // Posición horizontal aleatoria
        duration: Math.random() * 3 + 2, // Velocidad entre 2 y 5 segundos
        delay: Math.random() * 2, // Retraso inicial aleatorio
        size: Math.floor(Math.random() * 20) + 20 // Tamaño entre 20px y 40px
      }));

      // La fiesta dura 6 segundos
      setTimeout(() => {
        this.isPartyMode = false;
        this.partyItems = [];
      }, 6000);
    });
  }

  // Variable para saber si el input está enfocado
  isKeyboardOpen: boolean = false;

  onInputFocus() {
    this.isKeyboardOpen = true;
  }

  onInputBlur() {
    this.isKeyboardOpen = false;
  }
}