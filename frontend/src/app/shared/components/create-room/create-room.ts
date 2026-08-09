import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackMessage } from '../feedback-message/feedback-message';

@Component({
  selector: 'create-room-modal',
  standalone: true,
  imports: [FormsModule, FeedbackMessage],
  templateUrl: './createRoom.html',
})
export class CreateRoom {
  @Input() show = signal(false);
  @Input() apiError = signal<string | null>(null);
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ number: string; capacity: number; isAvailable: number }>();

  newRoom = {
    number: '',
    capacity: 1,
    isAvailable: 1,
  };

  saveNewRoom() {
    const payload = {
      number: this.newRoom.number.trim(),
      capacity: this.newRoom.capacity,
      isAvailable: this.newRoom.isAvailable,
    };

    if (!payload.number || !payload.capacity) {
      this.apiError.set('Please fill in room number and capacity.');
      return;
    }

    this.apiError.set(null);
    this.save.emit(payload);
  }

  closeCreateModal() {
    this.apiError.set(null);
    this.close.emit();
  }
}
