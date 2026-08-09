import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackMessage } from '../feedback-message/feedback-message';

@Component({
  selector: 'create-session-modal',
  standalone: true,
  imports: [FormsModule, FeedbackMessage],
  templateUrl: './createSession.html',
})
export class CreateSession {
  @Input() show = signal(false);
  @Input() apiError = signal<string | null>(null);
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{
    coachId: number;
    roomId: number;
    level: string;
    date: string;
    startTime: string;
    endTime: string;
    places: number;
  }>();

  newSession = {
    coachId: 0,
    roomId: 0,
    level: '',
    date: '',
    startTime: '',
    endTime: '',
    places: 0,
  };

  saveNewSession() {
    const payload = {
      coachId: Number(this.newSession.coachId),
      roomId: Number(this.newSession.roomId),
      level: this.newSession.level.trim(),
      date: this.newSession.date,
      startTime: this.newSession.startTime,
      endTime: this.newSession.endTime,
      places: Number(this.newSession.places),
    };

    if (!payload.coachId || !payload.roomId || !payload.level || !payload.date || !payload.startTime || !payload.endTime || !payload.places) {
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
