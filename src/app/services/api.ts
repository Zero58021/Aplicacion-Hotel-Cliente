import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // Añadimos HttpHeaders
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // La URL base viene de tu environment.ts
  public url = `${environment.apiUrl}/reservas`;

  // Cabeceras especiales para saltarse el aviso de ngrok
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true' // <--- ESTO ES LO QUE SOLUCIONA EL TAB 5 VACÍO
    })
  };

  constructor(private http: HttpClient) { }

  // Guardar una nueva reserva (POST)
  crearReserva(reserva: any): Observable<any> {
    // Al crear también enviamos las cabeceras por seguridad
    return this.http.post(this.url, reserva, this.httpOptions);
  }

  // Obtener todas las reservas (GET)
  obtenerReservas(): Observable<any[]> {
    // Aquí es vital enviar el httpOptions para que ngrok devuelva el JSON directamente
    return this.http.get<any[]>(this.url, this.httpOptions);
  }

  // Cancelar reserva (PATCH)
  cancelarReserva(id: string): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, { estado: 'Cancelada' }, this.httpOptions);
  }
  
  // Borrar físicamente (DELETE)
  borrarReserva(id: string): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, this.httpOptions);
  }
}