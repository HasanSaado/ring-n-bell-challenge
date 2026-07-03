import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideChevronDown, LucideChevronUp, LucideChevronsUpDown } from '@lucide/angular';

import { OrganizationSortBy, SortOrder } from '../../../core/organizations/organization.models';

@Component({
  selector: 'sort-header',
  standalone: true,
  imports: [LucideChevronDown, LucideChevronUp, LucideChevronsUpDown],
  templateUrl: './sort-header.html',
})
export class SortHeaderComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) sortKey!: OrganizationSortBy;
  @Input({ required: true }) activeSortBy!: OrganizationSortBy;
  @Input({ required: true }) sortOrder!: SortOrder;
  @Input({ required: true }) ariaLabel = '';
  @Output() sort = new EventEmitter<OrganizationSortBy>();

  get isActive(): boolean {
    return this.activeSortBy === this.sortKey;
  }

  get isAscending(): boolean {
    return this.isActive && this.sortOrder === 'asc';
  }

  get isDescending(): boolean {
    return this.isActive && this.sortOrder === 'desc';
  }
}
