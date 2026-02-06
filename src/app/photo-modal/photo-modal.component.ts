import { Component, Input, OnDestroy } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';

interface Point { x: number; y: number }

@Component({
  selector: 'app-photo-modal',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './photo-modal.component.html',
  styleUrls: ['./photo-modal.component.scss']
})
export class PhotoModalComponent implements OnDestroy {
  @Input() src = '';

  // transform state
  scale = 1;
  translateX = 0;
  translateY = 0;

  private minScale = 0.5;
  private maxScale = 4;

  // pointer tracking for pinch/drag
  private pointers = new Map<number, Point>();
  private initialDistance: number | null = null;
  private initialScale = 1;
  private initialMidpoint: Point | null = null;
  private initialTranslate: Point = { x: 0, y: 0 };

  constructor(private modalCtrl: ModalController) {}

  ngOnDestroy(): void {
    this.pointers.clear();
  }

  close() {
    this.modalCtrl.dismiss();
  }

  // buttons
  zoomIn() {
    this.setScale(this.scale + 0.25);
  }

  zoomOut() {
    this.setScale(this.scale - 0.25);
  }

  resetZoom() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
  }

  private setScale(s: number) {
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, +(s).toFixed(3)));
  }

  // Pointer event handlers for pinch & pan
  onPointerDown(ev: PointerEvent) {
    (ev.target as Element).setPointerCapture(ev.pointerId);
    this.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (this.pointers.size === 2) {
      const pts = Array.from(this.pointers.values());
      this.initialDistance = this.distance(pts[0], pts[1]);
      this.initialScale = this.scale;
      this.initialMidpoint = this.midpoint(pts[0], pts[1]);
      this.initialTranslate = { x: this.translateX, y: this.translateY };
    }
  }

  onPointerMove(ev: PointerEvent) {
    if (!this.pointers.has(ev.pointerId)) return;
    const prev = this.pointers.get(ev.pointerId)!;
    const cur = { x: ev.clientX, y: ev.clientY } as Point;
    // update map after computing delta
    this.pointers.set(ev.pointerId, cur);

    if (this.pointers.size === 2 && this.initialDistance && this.initialMidpoint) {
      const pts = Array.from(this.pointers.values());
      const curDist = this.distance(pts[0], pts[1]);
      const scaleFactor = curDist / this.initialDistance;
      this.setScale(this.initialScale * scaleFactor);

      // compute new midpoint and pan accordingly so zoom centers on fingers
      const curMid = this.midpoint(pts[0], pts[1]);
      const dx = curMid.x - this.initialMidpoint.x;
      const dy = curMid.y - this.initialMidpoint.y;

      // apply translation relative to initialTranslate
      this.translateX = this.initialTranslate.x + dx;
      this.translateY = this.initialTranslate.y + dy;
    } else if (this.pointers.size === 1) {
      // single-finger drag -> pan if zoomed in
      if (this.scale <= 1) return;
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      this.translateX += dx;
      this.translateY += dy;
    }
  }

  onPointerUp(ev: PointerEvent) {
    try { (ev.target as Element).releasePointerCapture(ev.pointerId); } catch { }
    this.pointers.delete(ev.pointerId);
    if (this.pointers.size < 2) {
      this.initialDistance = null;
      this.initialMidpoint = null;
      this.initialScale = this.scale;
      this.initialTranslate = { x: this.translateX, y: this.translateY };
    }
  }

  // Helpers
  private distance(a: Point, b: Point) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  private midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
}

