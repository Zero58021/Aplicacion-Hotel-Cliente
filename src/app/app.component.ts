import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    try {
      document.documentElement.setAttribute('data-theme', 'light');
    } catch (e) {
      // no-op for non-browser environments
    }
  }
}
