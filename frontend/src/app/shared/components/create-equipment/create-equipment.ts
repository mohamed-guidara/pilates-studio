import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackMessage } from '../feedback-message/feedback-message';
import { Room } from '../../models/room.model';

@Component({
  selector: 'create-equipment-modal',
  standalone: true,
  imports: [FormsModule, FeedbackMessage],
  templateUrl: './createEquipment.html',
})
export class CreateEquipment {
  @Input() show = signal(false);
  @Input() apiError = signal<string | null>(null);
  @Input() rooms: Room[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ roomId: number; name: string; description: string; isAvailable: number }>();

  newEquipment = {
    roomId: 0,
    name: '',
    description: '',
    isAvailable: 1,
  };

  saveNewEquipment() {
    const payload = {
      roomId: Number(this.newEquipment.roomId),
      name: this.newEquipment.name.trim(),
      description: this.newEquipment.description.trim(),
      isAvailable: this.newEquipment.isAvailable,
    };

    if (!payload.roomId || !payload.name || !payload.description) {
      this.apiError.set('Please fill in all required fields.');
      return;
    }

    this.apiError.set(null);
    this.save.emit(payload);
  }

  closeCreateModal() {
    this.close.emit();
  }
}
