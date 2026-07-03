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
      'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
      this.variantClasses,
    ].join(' ');
  }

  private get variantClasses(): string {
    switch (this.variant) {
      case 'ghost':
        return 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950';
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-700 shadow-sm hover:border-red-300 hover:bg-red-100';
      case 'secondary':
        return 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950';
    }
  }
}
