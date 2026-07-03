import { Component, Input } from '@angular/core';

@Component({
  selector: 'status-badge',
  standalone: true,
  templateUrl: './status-badge.html',
})
export class StatusBadgeComponent {
  @Input({ required: true }) isActive = false;

  get label(): string {
    return this.isActive ? 'Active' : 'Inactive';
  }
}
