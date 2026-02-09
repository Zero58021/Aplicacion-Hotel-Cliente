import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private _selectedRoom$ = new BehaviorSubject<any | null>(null);

  get selectedRoom$(): Observable<any | null> {
    return this._selectedRoom$.asObservable();
  }

  get current(): any | null {
    return this._selectedRoom$.value;
  }

  setSelectedRoom(room: any | null) {
    this._selectedRoom$.next(room);
    try { localStorage.setItem('selectedRoom', JSON.stringify(room)); } catch (e) { }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem('selectedRoom');
      if (!raw) return;
      const r = JSON.parse(raw);
      this._selectedRoom$.next(r);
    } catch (e) { }
  }
}
