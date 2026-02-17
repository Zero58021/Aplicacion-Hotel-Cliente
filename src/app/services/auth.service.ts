import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Opciones HTTP para evitar advertencias de Ngrok y definir JSON
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    })
  };

  constructor(private http: HttpClient, private router: Router) {
    this.loadSession();
  }

  private loadSession() {
    const saved = localStorage.getItem('clientUser');
    if (saved) {
      this.currentUserSubject.next(JSON.parse(saved));
    }
  }

  // --- LOGIN ---
  login(usuario: string, contrasena: string): Observable<boolean> {
    console.log('--- INTENTANDO LOGIN ---');
    
    return this.http.get<any[]>(`${this.apiUrl}/clientes`, this.httpOptions).pipe(
      map(clientes => {
        const encontrado = clientes.find(c => 
          c.usuario && 
          c.usuario.trim().toLowerCase() === usuario.trim().toLowerCase() && 
          c.password == contrasena
        );

        if (encontrado) {
          console.log('🎉 Login correcto:', encontrado.usuario);
          this.setSession(encontrado);
          return true;
        } else {
          console.warn('⛔ Credenciales incorrectas');
          return false;
        }
      }),
      catchError(err => {
        console.error('❌ Error de conexión:', err);
        return of(false);
      })
    );
  }

  // --- REGISTRO ---
  register(newClient: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/clientes`, newClient, this.httpOptions);
  }

  // --- GESTIÓN DE SESIÓN ---
  private setSession(user: any) {
    localStorage.setItem('clientUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  updateUser(user: any) {
    localStorage.setItem('clientUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout() {
    this.currentUserSubject.next(null);
    localStorage.removeItem('clientUser');     
    localStorage.removeItem('rememberedUser'); 
    this.router.navigate(['/login']);
  }
  
  getUser() {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  // --- VALIDACIONES (DUPLICADOS) ---
  
  // AHORA ACEPTA: email, usuario, dni Y TELEFONO
  async checkUserExists(email: string, usuario: string, dni: string, telefono: string): Promise<{exists: boolean, type?: string}> {
    try {
      // Lanzamos las 4 peticiones a la vez para ir rápido
      const checkEmail$ = this.http.get<any[]>(`${this.apiUrl}/clientes?email=${email}`, this.httpOptions);
      const checkUser$ = this.http.get<any[]>(`${this.apiUrl}/clientes?usuario=${usuario}`, this.httpOptions);
      const checkDni$ = this.http.get<any[]>(`${this.apiUrl}/clientes?dni=${dni}`, this.httpOptions);
      const checkTel$ = this.http.get<any[]>(`${this.apiUrl}/clientes?telefono=${telefono}`, this.httpOptions); // <--- NUEVA LÍNEA

      const [emailRes, userRes, dniRes, telRes] = await Promise.all([
        firstValueFrom(checkEmail$),
        firstValueFrom(checkUser$),
        firstValueFrom(checkDni$),
        firstValueFrom(checkTel$) // <--- NUEVA RESPUESTA
      ]);

      // Comprobamos resultados
      if (userRes && userRes.length > 0) return { exists: true, type: 'usuario' };
      if (emailRes && emailRes.length > 0) return { exists: true, type: 'email' };
      if (dniRes && dniRes.length > 0) return { exists: true, type: 'dni' };
      if (telRes && telRes.length > 0) return { exists: true, type: 'telefono' }; // <--- COMPROBACIÓN

      return { exists: false }; 
    } catch (error) {
      console.error('Error comprobando duplicados:', error);
      return { exists: false };
    }
  }
}