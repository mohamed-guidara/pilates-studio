import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth';
import { ReservationService } from '../../../services/reservationService.service';
import { SessionService } from '../../../services/sessionService.service';
import { Reservation } from '../../../shared/models/reservation.model';
import { Session } from '../../../shared/models/session.model';
import { SessionLevelPipe } from '../../../assets/session-level-pipe';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [CommonModule, SessionLevelPipe, SessionCategoryPipe],
  templateUrl: './welcome-page.html',
  styleUrl: './welcome-page.css',
})
export class WelcomePage implements OnInit {

  firstName: string;
  today = new Date();
  isLoading = signal(true);
  pageError = signal(false);
  totalReservations = signal(0);
  confirmedReservations = signal(0);
  occupationRate = signal(0);
  upcomingSessions = signal(0);
  trend = signal<number[]>([0, 0, 0, 0, 0, 0, 0]);
  trendLabels = this.getTrendLabels();
  nextSessions = signal<Array<Session & { booked: number; rate: number }>>([]);

  constructor(
    private auth: AuthService,
    private reservationService: ReservationService,
    private sessionService: SessionService,
  ) {
    this.firstName = this.auth.getFirstName() || 'there';
  }

  ngOnInit(): void {
    forkJoin({
      reservations: this.reservationService.getReservations(),
      sessions: this.sessionService.getSessions(),
    }).subscribe({
      next: ({ reservations, sessions }) => this.buildDashboard(reservations, sessions),
      error: (error) => {
        this.pageError.set(true);
        this.isLoading.set(false);
        console.error('Error loading welcome dashboard:', error);
      },
    });
  }

  private buildDashboard(reservations: Reservation[], sessions: Session[]): void {
    const confirmed = reservations.filter((reservation) => reservation.status === 2);
    const totalPlaces = sessions.reduce((sum, session) => sum + Number(session.places || 0), 0);
    const now = new Date();
    const upcoming = sessions
      .filter((session) => new Date(`${session.date}T${session.startTime || '00:00'}`) >= now)
      .sort((a, b) => this.sessionTimestamp(a) - this.sessionTimestamp(b));

    this.totalReservations.set(reservations.length);
    this.confirmedReservations.set(confirmed.length);
    this.occupationRate.set(totalPlaces ? Math.min(100, Math.round((confirmed.length / totalPlaces) * 100)) : 0);
    this.upcomingSessions.set(upcoming.length);
    this.trend.set(this.getTrend(reservations));
    this.nextSessions.set(upcoming.map((session) => {
      const booked = confirmed.filter((reservation) => reservation.sessionId === session.sessionId).length;
      const capacity = Number(session.places || 0);
      return { ...session, booked, rate: capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0 };
    }));
    this.isLoading.set(false);
  }

  sessionTimestamp(session: Session): number {
    return new Date(`${session.date}T${session.startTime || '00:00'}`).getTime();
  }

  formatSessionDate(session: Session): string {
    return new Date(`${session.date}T${session.startTime || '00:00'}`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }

  getTrendPoint(value: number, index: number): string {
    const values = this.trend();
    const max = this.getTrendMax();
    return `${12 + index * 52},${142 - (value / max) * 112}`;
  }

  getTrendMax(): number {
    return Math.max(...this.trend(), 1);
  }

  getTrendArea(): string {
    return `12,142 ${this.trend().map((value, index) => this.getTrendPoint(value, index)).join(' ')} 324,142`;
  }

  private getTrend(reservations: Reservation[]): number[] {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    return days.map((day) => reservations.filter((reservation) => {
      const created = new Date(reservation.createdAt);
      return created.toDateString() === day.toDateString();
    }).length);
  }

  private getTrendLabels(): string[] {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
    });
  }
}
