import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    })
  };

  constructor(private http: HttpClient) {
    this.loadSession();
  }

  private loadSession() {
    const saved = localStorage.getItem('clientUser');
    if (saved) {
      this.currentUserSubject.next(JSON.parse(saved));
    }
  }

  // LOGIN DEPURADO
  login(usuario: string, contrasena: string): Observable<boolean> {
    console.log('--- INTENTANDO LOGIN ---');
    console.log(`Buscando usuario: "${usuario}" con pass: "${contrasena}"`);
    console.log(`URL de consulta: ${this.apiUrl}/clientes`);

    return this.http.get<any[]>(`${this.apiUrl}/clientes`, this.httpOptions).pipe(
      tap(clientes => {
        console.log('✅ El servidor ha respondido. Lista de clientes:', clientes);
      }),
      map(clientes => {
        // Buscamos coincidencia (quitamos espacios y mayúsculas por si acaso)
        const encontrado = clientes.find(c => 
          c.usuario && 
          c.usuario.trim().toLowerCase() === usuario.trim().toLowerCase() && 
          c.password == contrasena // Usamos == por si uno es número y otro texto
        );

        if (encontrado) {
          console.log('🎉 ¡USUARIO ENCONTRADO!', encontrado);
          this.setSession(encontrado);
          return true;
        } else {
          console.warn('⛔ NO SE ENCONTRÓ COINCIDENCIA EN LA LISTA');
          return false;
        }
      }),
      catchError(err => {
        console.error('❌ ERROR GRAVE DE CONEXIÓN:', err);
        return of(false);
      })
    );
  }

  private setSession(user: any) {
    localStorage.setItem('clientUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Public helper to update current user data (e.g., after editing profile)
  updateUser(user: any) {
    localStorage.setItem('clientUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout() {
    localStorage.removeItem('clientUser');
    this.currentUserSubject.next(null);
  }

  getUser() {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }
}