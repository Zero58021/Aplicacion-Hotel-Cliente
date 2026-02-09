import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectionService } from '../services/selection.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab3',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
})

export class Tab3Page implements OnInit, OnDestroy {
  selectedRoom: any | null = null;
  private sub?: Subscription;

  constructor(private selectionService: SelectionService, private router: Router) { }

  ngOnInit() {
    this.selectionService.loadFromStorage();
    this.sub = this.selectionService.selectedRoom$.subscribe(r => this.selectedRoom = r);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  goToTab2(ev?: Event) {
    if (ev) ev.stopPropagation();
    this.router.navigateByUrl('/tabs/tab2');
  }

}
