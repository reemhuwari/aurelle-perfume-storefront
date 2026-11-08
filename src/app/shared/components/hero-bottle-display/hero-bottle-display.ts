import { AfterViewInit, Component, NgZone, OnDestroy, ViewChild, ViewContainerRef, inject, input } from '@angular/core';
import { MistCanvas, ScentKind } from '../mist-canvas/mist-canvas';
import { HeroBottle } from '../hero-bottle/hero-bottle';

export interface BottleStoryPose {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface BottleImplementation {
  spray(kind?: ScentKind): void;
  playIntroSequence(): void;
  setStoryTransform?(pose: BottleStoryPose): void;
}

@Component({
  selector: 'app-hero-bottle-display',
  standalone: true,
  template: '<ng-container #outlet></ng-container>',
  styles: [':host{display:block;width:100%;height:100%;pointer-events:none}']
})
export class HeroBottleDisplay implements AfterViewInit, OnDestroy {
  mistCanvas = input.required<MistCanvas>();
  @ViewChild('outlet', { read: ViewContainerRef, static: true }) private outlet!: ViewContainerRef;
  private zone = inject(NgZone);
  private implementation?: BottleImplementation;
  private destroyed = false;
  private pendingSpray?: ScentKind;
  private pendingIntro = false;
  ready: Promise<void> = Promise.resolve();
  isThreeDimensional = false;

  ngAfterViewInit() {
    this.ready = this.zone.runOutsideAngular(() => this.mount());
  }

  spray(kind: ScentKind = 0) {
    if (this.implementation) this.implementation.spray(kind);
    else this.pendingSpray = kind;
  }

  playIntroSequence() {
    if (this.implementation) this.implementation.playIntroSequence();
    else this.pendingIntro = true;
  }

  setStoryTransform(pose: BottleStoryPose) {
    this.implementation?.setStoryTransform?.(pose);
  }

  private async mount() {
    this.createPhotoFallback();
  }

  private createPhotoFallback() {
    if (this.destroyed) return;
    this.outlet.clear();
    const component = this.outlet.createComponent(HeroBottle);
    component.setInput('mistCanvas', this.mistCanvas());
    this.implementation = component.instance;
    if (this.pendingIntro) {
      this.pendingIntro = false;
      this.implementation.playIntroSequence();
    } else if (this.pendingSpray !== undefined) {
      const kind = this.pendingSpray;
      this.pendingSpray = undefined;
      this.implementation.spray(kind);
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.implementation = undefined;
  }
}
