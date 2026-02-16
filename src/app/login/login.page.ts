import { Component, OnInit } from '@angular/core';
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

  constructor(private auth: AuthService, private router: Router) { }

  ngOnInit() {
    /*// Si ya está logueado, lo mandamos directo dentro
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/tabs/tab1']);
    }*/
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
}