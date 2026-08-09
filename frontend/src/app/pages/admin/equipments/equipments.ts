import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Equipment } from '../../../shared/models/equipment.model';
import { EquipmentService } from '../../../services/equipmentService.service';
import { CreateEquipment } from '../../../shared/components/create-equipment/create-equipment';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';

@Component({
  selector: 'app-equipments',
  standalone: true,
  imports: [CommonModule, CreateEquipment, RouterLink, FeedbackMessage],
  templateUrl: './equipments.html',
  styleUrls: ['./equipments.css'],
})
export class Equipments implements OnInit {
  isLoading = signal(true);
  equipments = signal<Equipment[]>([]);

  showCreateModal = signal(false);
  createErrorMessage = signal<string | null>(null);
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private router: Router,
    private equipmentService: EquipmentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadEquipments();
  }

  loadEquipments() {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    this.equipmentService.getEquipments().pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (equipments) => {
        this.equipments.set(equipments);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load equipments. Please refresh the page.');
        console.error('Error loading equipments:', err);
        this.cdr.detectChanges();
      }
    });
  }

  createEquipment() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.createErrorMessage.set(null);
    this.showCreateModal.set(false);
  }

  handleCreate(newEquipment: { roomId: number; name: string; description: string; isAvailable: number }) {
    this.createErrorMessage.set(null);
    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.equipmentService.createEquipment(newEquipment).subscribe({
      next: () => {
        this.successMessage.set('Equipment created successfully.');
        this.showCreateModal.set(false);
        this.loadEquipments();
      },
      error: (err) => {
        this.createErrorMessage.set(this.extractErrorMessage(err) || 'Could not create equipment. Please try again.');
        console.error('Error creating equipment:', err);
      }
    });
  }

  deleteEquipment(id: number) {
    if (!confirm('Delete this equipment item?')) {
      return;
    }

    this.equipmentService.deleteEquipment(id).subscribe({
      next: () => {
        this.successMessage.set('Equipment deleted successfully.');
        this.loadEquipments();
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not delete equipment. Please try again.');
        console.error('Error deleting equipment:', err);
      }
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

