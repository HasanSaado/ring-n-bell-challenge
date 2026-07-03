import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

export type UiButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type UiButtonSize = 'sm' | 'md';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ui-button.html',
})
export class UiButtonComponent {
  @Input() variant: UiButtonVariant = 'secondary';
  @Input() size: UiButtonSize = 'md';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() routerLink: string | readonly unknown[] | null = null;
  @Output() pressed = new EventEmitter<void>();

  get classes(): string {
    return [
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
      this.size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
      this.variantClasses,
    ].join(' ');
  }

  private get variantClasses(): string {
    switch (this.variant) {
      case 'primary':
        return 'border-slate-950 bg-slate-950 text-white hover:border-slate-800 hover:bg-slate-800';
      case 'ghost':
        return 'border-transparent bg-transparent text-slate-700 shadow-none hover:bg-slate-100 hover:text-slate-950';
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100';
      case 'secondary':
        return 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950';
    }
  }
}
