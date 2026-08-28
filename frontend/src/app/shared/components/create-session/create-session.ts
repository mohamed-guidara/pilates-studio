import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackMessage } from '../feedback-message/feedback-message';
import { Room } from '../../models/room.model';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';
import { SessionLevelPipe } from '../../../assets/session-level-pipe';

@Component({
  selector: 'create-session-modal',
  standalone: true,
  imports: [FormsModule, FeedbackMessage, SessionCategoryPipe, SessionLevelPipe],
  templateUrl: './createSession.html',
})
export class CreateSession {
  @Input() show = signal(false);
  @Input() apiError = signal<string | null>(null);
  @Input() isLoading = signal(false);
  @Input() coachOptions: { coachId: number; fullName: string }[] = [];
  @Input() rooms: Room[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{
    coachId: number;
    roomId: number;
    level: number;
    date: string;
    startTime: string;
    endTime: string;
    places: number;
    price: number;
    category: number;
  }>();

  newSession = {
    coachId: 0,
    roomId: 0,
    level: 1,
    date: '',
    startTime: '',
    endTime: '',
    places: 0,
    price: 0,
    category: 0
  };

  saveNewSession() {
    const payload = {
      coachId: Number(this.newSession.coachId),
      roomId: Number(this.newSession.roomId),
      level: this.newSession.level,
      date: this.newSession.date,
      startTime: this.newSession.startTime,
      endTime: this.newSession.endTime,
      places: Number(this.newSession.places),
      price: Number(this.newSession.price),
      category: Number(this.newSession.category)
    };

    if (!payload.coachId || !payload.roomId || !payload.level || !payload.date || !payload.startTime || !payload.endTime || !payload.places || payload.price <= 0) {
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