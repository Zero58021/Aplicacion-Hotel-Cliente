import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // URL base desde environment.ts
  public apiUrl = environment.apiUrl;
  
  // Endpoint específico de reservas
  public urlReservas = `${this.apiUrl}/reservas`;

  // Cabeceras para Ngrok y JSON
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    })
  };

  constructor(private http: HttpClient) { }

  // --- RESERVAS ---

  // Crear reserva (POST)
  crearReserva(reserva: any): Observable<any> {
    return this.http.post(this.urlReservas, reserva, this.httpOptions);
  }

  // Obtener todas las reservas (GET)
  obtenerReservas(): Observable<any[]> {
    return this.http.get<any[]>(this.urlReservas, this.httpOptions);
  }

  // Alias para compatibilidad
  getReservas(): Observable<any[]> {
    return this.http.get<any[]>(this.urlReservas, this.httpOptions);
  }

  // --- NUEVO MÉTODO FILTRADO (SOLO ACTIVAS/FUTURAS) ---
  getReservasActivasCliente(email: string): Observable<any[]> {
    // Pedimos las reservas filtradas por email al servidor
    const url = `${this.urlReservas}?email=${email}`;

    return this.http.get<any[]>(url, this.httpOptions).pipe(
      map(reservas => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Reseteamos hora para comparar solo fecha (00:00 de hoy)

        // Filtramos: Devolvemos solo aquellas cuya fecha de salida es HOY o DESPUÉS
        return reservas.filter(reserva => {
          if (!reserva.fechaSalida) return false; 
          const fechaSalida = new Date(reserva.fechaSalida);
          return fechaSalida >= hoy; 
        });
      })
    );
  }

  // Cancelar reserva (PATCH)
  cancelarReserva(id: string): Observable<any> {
    return this.http.patch(`${this.urlReservas}/${id}`, { estado: 'Cancelada' }, this.httpOptions);
  }
  
  // Actualizar reserva genérica (PATCH)
  updateReserva(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.urlReservas}/${id}`, data, this.httpOptions);
  }

  // Borrar físicamente (DELETE)
  borrarReserva(id: string): Observable<any> {
    return this.http.delete(`${this.urlReservas}/${id}`, this.httpOptions);
  }

  // --- HABITACIONES ---

  // Obtener habitaciones (GET)
  getHabitaciones(): Observable<any[]> {
    const url = `${this.apiUrl}/habitaciones`;
    return this.http.get<any[]>(url, this.httpOptions);
  }

  // Actualizar una habitación (PATCH)
  actualizarHabitacion(id: string | number, body: any): Observable<any> {
    const url = `${this.apiUrl}/habitaciones/${id}`;
    return this.http.patch(url, body, this.httpOptions);
  }

  // --- CLIENTES ---

  // Registrar nuevo cliente (POST)
  registrarCliente(cliente: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/clientes`, cliente, this.httpOptions);
  }
  
  // Obtener todos los clientes (GET)
  getClientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/clientes`, this.httpOptions);
  }

  // Actualizar cliente (PATCH)
  updateCliente(id: string | number, body: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/clientes/${id}`, body, this.httpOptions);
  }
}