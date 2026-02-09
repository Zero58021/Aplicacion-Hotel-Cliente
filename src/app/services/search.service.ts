import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SearchCriteria {
  checkin?: string | null;
  checkout?: string | null;
  adults: number;
  children: number;
  rooms: number;
  pets: boolean;
  // Filtros adicionales para búsqueda de habitaciones
  roomType?: string | null;
  floor?: string | null;
  amenities?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private _criteria$ = new BehaviorSubject<SearchCriteria | null>(null);

  /** Observable para suscribirse a cambios en los criterios */
  get criteria$(): Observable<SearchCriteria | null> {
    return this._criteria$.asObservable();
  }

  /** Valor sincronizado (actual) */
  get current(): SearchCriteria | null {
    return this._criteria$.value;
  }

  setCriteria(c: SearchCriteria | null) {
    this._criteria$.next(c);
  }

  clear() {
    this._criteria$.next(null);
  }
}
