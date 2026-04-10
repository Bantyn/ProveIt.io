import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import gsap from 'gsap';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound implements AfterViewInit {

  @ViewChild('title') title!: ElementRef;
  @ViewChild('subtitle') subtitle!: ElementRef;
  @ViewChild('desc') desc!: ElementRef;
  @ViewChild('btn') btn!: ElementRef;

  ngAfterViewInit() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    tl
    .from(this.title.nativeElement, {
      y: 80,
      opacity: 0,
      duration: 1
    })
    .from(this.subtitle.nativeElement, {
      y: 40,
      opacity: 0,
      duration: 0.2
    })
    .from(this.desc.nativeElement, {
      y: 30,
      opacity: 0,
      duration: 0.3
    })
    .from(this.btn.nativeElement, {
      y: 20,
      opacity: 0,
      duration: 0.4
    });
  }

  goback() {
    window.history.back();
  }
}
