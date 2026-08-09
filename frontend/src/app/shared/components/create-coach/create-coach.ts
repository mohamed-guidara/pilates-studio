import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FeedbackMessage } from '../feedback-message/feedback-message';

@Component({
  selector: 'create-coach-modal',
  standalone: true,
  imports: [FormsModule, FeedbackMessage],
  templateUrl: './createCoach.html',
})
export class CreateCoach {
  @Input() show = signal(false); // parent controls visibility
  @Input() apiError = signal<string | null>(null);
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    isAdmin: number;
  }>();

  newCoach = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    isAdmin: 0
  };
  isLoading = signal(false)

  saveNewCoach() {
    const payload = {
      email: this.newCoach.email.trim(),
      password: this.newCoach.password.trim(),
      firstName: this.newCoach.firstName.trim(),
      lastName: this.newCoach.lastName.trim(),
      birthDate: this.newCoach.birthDate,
      isAdmin: Number(this.newCoach.isAdmin)
    };

    if (!payload.firstName || !payload.lastName || !payload.birthDate || !payload.email || !payload.password) {
      this.apiError.set('Please fill in all required fields.');
      return;
    }

    this.apiError.set(null);
    this.isLoading.set(true);
    this.save.emit(payload);
  }

  closeCreateModal() {
    this.close.emit(); // just notify parent to close
  }
}
