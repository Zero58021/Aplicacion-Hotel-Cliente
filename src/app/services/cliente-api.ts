import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClienteApiService {

  // Traemos la URL que pusiste en environment.ts (ej: http://192.168.1.35:3000)
  // Le añadimos '/reservas' porque así se llama la "tabla" en tu db.json
  private url = `${environment.apiUrl}/reservas`;

  constructor(private http: HttpClient) { }

  // Esta función recibe un objeto (la reserva) y lo manda al servidor
  nuevaReserva(datos: any) {
    return this.http.post(this.url, datos);
  }
}