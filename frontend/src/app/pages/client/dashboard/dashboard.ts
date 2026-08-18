import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar, SidebarNavItem } from '../../../shared/components/sidebar/sidebar';

@Component({
  selector: 'client-dashboard',
  standalone: true,
  imports: [Sidebar, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class ClientDashboard {
  navItems: SidebarNavItem[] = [
    { to: '/client/sessions', label: 'Sessions' },
    { to: '/client/reservations', label: 'My Bookings' },
  ];

  /**
   * Placeholder — notifications aren't built yet. Wires up the bell so navigation
   * is complete; swap the modal's content for the real notification list later.
   */
  showNotifications = signal(false);

  toggleNotifications(): void {
    this.showNotifications.update((v) => !v);
  }
}