import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Sidebar, SidebarNavItem } from '../../../shared/components/sidebar/sidebar';
import { ClientService } from '../../../services/clientService.service';
import { NotificationService } from '../../../services/notificationService.service';
import { Notification } from '../../../shared/models/notification.model';
import { resolveCurrentClient } from '../../../shared/utils/session-enrichment.util';

/** Reservation expiry, waiting-list promotion, and reminders are now handled by the
 *  Laravel `sessions:process-lifecycle` scheduled command — this component no longer
 *  triggers any of that. It still polls periodically because there's no push
 *  mechanism (websockets, SSE, etc.) to tell the client "a notification just
 *  arrived" — this just refreshes the list/badge so new ones show up without a
 *  full page reload. */
const POLL_INTERVAL_MS = 30 * 1000;

@Component({
  selector: 'client-dashboard',
  standalone: true,
  imports: [CommonModule, Sidebar, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class ClientDashboard implements OnInit, OnDestroy {
  navItems: SidebarNavItem[] = [
    { to: '/client/sessions', label: 'Sessions' },
    { to: '/client/reservations', label: 'My Bookings' },
  ];

  showNotifications = signal(false);
  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);
  isLoadingNotifications = signal(false);

  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(
    private clientService: ClientService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadNotifications(false);
    this.pollHandle = setInterval(() => this.loadNotifications(false), POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
  }

  toggleNotifications(): void {
    const opening = !this.showNotifications();
    this.showNotifications.set(opening);

    if (opening) {
      // Refresh on open so anything created since the last load shows up, then mark
      // everything as read now that it's actually being shown to the client.
      this.loadNotifications(true);
    }
  }

  private loadNotifications(markReadAfter: boolean): void {
    this.isLoadingNotifications.set(true);

    forkJoin({
      clients: this.clientService.getClients(),
      notifications: this.notificationService.getNotifications(),
    }).subscribe({
      next: ({ clients, notifications }) => {
        const clientId = resolveCurrentClient(clients);

        const mine =
          clientId === null
            ? []
            : notifications
                .filter((n) => n.clientId === clientId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        this.notifications.set(mine);
        this.unreadCount.set(mine.filter((n) => n.isSeen !== 1).length);
        this.isLoadingNotifications.set(false);

        if (markReadAfter) {
          this.markAllAsRead();
        }
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
        this.isLoadingNotifications.set(false);
      },
    });
  }

  private markAllAsRead(): void {
    const unseen = this.notifications().filter((n) => n.isSeen !== 1);
    if (unseen.length === 0) return;

    const requests = unseen.map((n) =>
      this.notificationService.updateNotification(n.notificationId, {
        clientId: n.clientId,
        subject: n.subject,
        content: n.content,
        isSeen: 1,
      }),
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, isSeen: 1 })));
        this.unreadCount.set(0);
      },
      error: (err) => console.error('Error marking notifications as read:', err),
    });
  }

  formatWhen(createdAt: string): string {
    return new Date(createdAt).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}