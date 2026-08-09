import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { SessionService } from '../../../services/sessionService.service';
import { Session } from '../../../shared/models/session.model';
import { CreateSession } from '../../../shared/components/create-session/create-session';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, CreateSession, RouterLink, FeedbackMessage],
  templateUrl: './sessions.html',
  styleUrl: './sessions.css',
})
export class Sessions implements OnInit {
  isLoading = signal(true);
  sessions = signal<Session[]>([]);

  showCreateModal = signal(false);
  createErrorMessage = signal<string | null>(null);
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // Pick up success message redirected from UpdateSession (queryParams.success)
    const redirectSuccess = this.route.snapshot.queryParamMap.get('success');
    if (redirectSuccess) {
      this.successMessage.set(redirectSuccess);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }

    this.loadSessions();
  }

  loadSessions() {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    this.sessionService.getSessions().pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load sessions. Please refresh the page.');
        console.error('Error loading sessions:', err);
        this.cdr.detectChanges();
      }
    });
  }

  createSession() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.createErrorMessage.set(null);
    this.showCreateModal.set(false);
  }

  handleCreate(newSession: {
    coachId: number;
    roomId: number;
    level: string;
    date: string;
    startTime: string;
    endTime: string;
    places: number;
  }) {
    this.createErrorMessage.set(null);
    this.pageErrorMessage.set(null);

    this.sessionService.createSession(newSession).subscribe({
      next: () => {
        this.successMessage.set('Session created successfully.');
        this.showCreateModal.set(false);
        this.loadSessions();
      },
      error: (err) => {
        this.createErrorMessage.set(this.extractErrorMessage(err) || 'Could not create session. Please try again.');
        console.error('Error creating session:', err);
      }
    });
  }

  deleteSession(id: number) {
    if (!confirm('Delete this session?')) {
      return;
    }

    this.sessionService.deleteSession(id).subscribe({
      next: () => {
        this.successMessage.set('Session deleted successfully.');
        this.loadSessions();
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not delete session. Please try again.');
        console.error('Error deleting session:', err);
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