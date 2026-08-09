import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'feedback-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (message) {
      <div [class]="messageClass" role="alert">
        {{ message }}
      </div>
    }
  `,
})
export class FeedbackMessage {
  @Input() message: string | null = null;
  @Input() type: 'error' | 'success' = 'error';

  get messageClass(): string {
    return this.type === 'success'
      ? 'rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'
      : 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700';
  }


}
