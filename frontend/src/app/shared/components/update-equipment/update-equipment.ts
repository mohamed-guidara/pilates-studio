import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Equipment } from '../../models/equipment.model';
import { EquipmentService } from '../../../services/equipmentService.service';
import { FeedbackMessage } from '../feedback-message/feedback-message';

@Component({
  selector: 'update-equipment',
  standalone: true,
  imports: [FormsModule, RouterLink, FeedbackMessage],
  templateUrl: './updateEquipment.html',
})
export class UpdateEquipment implements OnInit {
  equipmentId = -1;
  equipment = signal<Equipment | null>(null);
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private equipmentService: EquipmentService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      const id = Number(rawId);
      if (id > 0) {
        this.equipmentId = id;
        this.loadEquipment(id);
      } else {
        this.pageErrorMessage.set('Invalid equipment id.');
      }
    });
  }

  private loadEquipment(id: number) {
    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.equipmentService.getEquipment(id).subscribe({
      next: (equipment) => this.equipment.set(equipment),
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load equipment data.');
        console.error('Error loading equipment:', err);
      },
    });
  }

  updateEquipmentField<K extends keyof Equipment>(key: K, value: Equipment[K]) {
    const current = this.equipment();
    if (current) {
      this.equipment.set({ ...current, [key]: value });
    }
  }

  saveEquipment() {
    const equipment = this.equipment();
    if (!equipment) {
      this.pageErrorMessage.set('Unable to save. Equipment data is not loaded.');
      return;
    }

    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.equipmentService.updateEquipment(equipment.equipmentId, {
      roomId: equipment.roomId,
      name: equipment.name,
      description: equipment.description,
      isAvailable: equipment.isAvailable,
    }).subscribe({
      next: () => {
        this.router.navigate(['/admin/equipments'], {
          queryParams: { success: 'Equipment updated successfully.' },
          replaceUrl: true,
        });
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not update equipment. Please try again.');
        console.error('Error updating equipment:', err);
      },
    });
  }

  private extractErrorMessage(err: any): string {
    const message = err?.error?.message || err?.message;
    const errors = err?.error?.errors;

    if (typeof message === 'string' && message) {
      return message;
    }

    if (errors && typeof errors === 'object') {
      return Object.values(errors)
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string')
        .join(' ');
    }

    return err?.statusText || 'An unexpected error occurred.';
  }
}
