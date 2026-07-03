import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

export type UiIconButtonVariant = 'ghost' | 'secondary' | 'danger';

@Component({
  selector: 'ui-icon-button',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ui-icon-button.html',
})
export class UiIconButtonComponent {
  @Input() variant: UiIconButtonVariant = 'secondary';
  @Input({ alias: 'aria-label', required: true }) ariaLabel = '';
  @Input({ required: true }) title = '';
  @Input() disabled = false;
  @Input() routerLink: string | readonly unknown[] | null = null;
  @Output() pressed = new EventEmitter<void>();

  get classes(): string {
    return [
      'inline-flex h-8 w-8 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-55',
      this.variantClasses,
    ].join(' ');
  }

  private get variantClasses(): string {
    switch (this.variant) {
      case 'ghost':
        return 'text-slate-600 hover:bg-slate-100 hover:text-slate-950';
      case 'danger':
        return 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
      case 'secondary':
        return 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50';
    }
  }
}
