import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-card',
  standalone: true,
  templateUrl: './ui-card.html',
})
export class UiCardComponent {
  @Input() padding: 'none' | 'sm' | 'md' = 'md';

  get classes(): string {
    const paddingClass = this.padding === 'none' ? '' : this.padding === 'sm' ? 'p-4' : 'p-5';
    return `rounded-xl border border-slate-200 bg-white shadow-sm ${paddingClass}`.trim();
  }
}
