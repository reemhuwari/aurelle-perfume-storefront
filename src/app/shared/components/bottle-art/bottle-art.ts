import { Component, input } from '@angular/core';

let uid = 0;

/** زجاجة SVG واقعية (زجاج، سائل، غطاء ذهبي، انعكاسات) بثلاث أشكال، تُلوَّن بلون العطر. تُستخدم في البطاقات. */
@Component({
  selector: 'app-bottle-art',
  template: `
  <svg viewBox="0 0 120 200" role="img" [attr.aria-label]="'زجاجة عطر'" [style.--c]="color()">
    <defs>
      <linearGradient [attr.id]="id + 'g'" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".28" stop-color="#fff" stop-opacity=".07"/>
        <stop offset=".72" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/>
      </linearGradient>
      <linearGradient [attr.id]="id + 'l'" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" style="stop-color:var(--c);stop-opacity:.8"/><stop offset="1" style="stop-color:var(--c)"/>
      </linearGradient>
      <linearGradient [attr.id]="id + 'd'" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/>
      </linearGradient>
      <linearGradient [attr.id]="id + 'm'" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#6e4f22"/><stop offset=".3" stop-color="#f0d9a0"/><stop offset=".6" stop-color="#cba36a"/><stop offset="1" stop-color="#5e4119"/>
      </linearGradient>
      <radialGradient [attr.id]="id + 's'"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <clipPath [attr.id]="id + 'c'"><circle cx="60" cy="128" r="42"/></clipPath>
    </defs>
    <ellipse cx="60" cy="184" rx="46" ry="6" [attr.fill]="'url(#' + id + 's)'"/>

    @switch (variant() % 3) {
      @case (0) {
        <rect x="33" y="96" width="54" height="73" rx="7" [attr.fill]="'url(#' + id + 'l)'"/>
        <rect x="33" y="96" width="54" height="73" rx="7" [attr.fill]="'url(#' + id + 'd)'"/>
        <rect x="28" y="62" width="64" height="112" rx="10" [attr.fill]="'url(#' + id + 'g)'" stroke="#fff" stroke-opacity=".35"/>
        <rect x="50" y="48" width="20" height="16" [attr.fill]="'url(#' + id + 'g)'" stroke="#fff" stroke-opacity=".3"/>
        <rect x="46" y="42" width="28" height="8" rx="2" [attr.fill]="'url(#' + id + 'm)'"/>
        <rect x="44" y="12" width="32" height="32" rx="4" [attr.fill]="'url(#' + id + 'm)'"/>
        <rect x="34" y="70" width="5" height="96" rx="2.5" fill="#fff" opacity=".3"/>
        <rect x="42" y="118" width="36" height="30" rx="2" fill="#f7ece6" opacity=".88"/>
        <text x="60" y="136" text-anchor="middle" font-size="5.5" letter-spacing="1" fill="#2b0b16" font-family="serif">AURELLE</text>
      }
      @case (1) {
        <g [attr.clip-path]="'url(#' + id + 'c)'">
          <rect x="10" y="104" width="100" height="70" [attr.fill]="'url(#' + id + 'l)'"/>
          <rect x="10" y="104" width="100" height="70" [attr.fill]="'url(#' + id + 'd)'"/>
        </g>
        <circle cx="60" cy="128" r="46" [attr.fill]="'url(#' + id + 'g)'" stroke="#fff" stroke-opacity=".35"/>
        <rect x="51" y="52" width="18" height="30" [attr.fill]="'url(#' + id + 'g)'" stroke="#fff" stroke-opacity=".3"/>
        <rect x="47" y="46" width="26" height="8" rx="2" [attr.fill]="'url(#' + id + 'm)'"/>
        <rect x="42" y="14" width="36" height="34" rx="14" [attr.fill]="'url(#' + id + 'm)'"/>
        <ellipse cx="40" cy="112" rx="4" ry="18" fill="#fff" opacity=".3" transform="rotate(18 40 112)"/>
        <circle cx="60" cy="132" r="14" fill="#f7ece6" opacity=".88"/>
        <text x="60" y="134" text-anchor="middle" font-size="4.6" letter-spacing=".8" fill="#2b0b16" font-family="serif">AURELLE</text>
      }
      @default {
        <rect x="42" y="84" width="36" height="90" rx="3" [attr.fill]="'url(#' + id + 'l)'"/>
        <rect x="42" y="84" width="36" height="90" rx="3" [attr.fill]="'url(#' + id + 'd)'"/>
        <rect x="38" y="40" width="44" height="138" rx="6" [attr.fill]="'url(#' + id + 'g)'" stroke="#fff" stroke-opacity=".35"/>
        <rect x="42" y="10" width="36" height="32" rx="3" [attr.fill]="'url(#' + id + 'm)'"/>
        <rect x="44" y="48" width="4" height="120" rx="2" fill="#fff" opacity=".3"/>
        <rect x="46" y="100" width="28" height="44" rx="2" fill="#f7ece6" opacity=".88"/>
        <text x="60" y="124" text-anchor="middle" font-size="4.8" letter-spacing=".8" fill="#2b0b16" font-family="serif">AURELLE</text>
      }
    }
  </svg>`,
  styles: [`:host{display:block;width:100%;height:100%}svg{width:100%;height:100%;display:block;overflow:visible}`]
})
export class BottleArt {
  color = input('#d9567c');
  variant = input(0);
  protected id = 'ba' + uid++ + '-';
}
