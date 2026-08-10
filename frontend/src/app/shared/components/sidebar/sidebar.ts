import { Component, signal } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/auth';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  
  navItems = [
    { to: '/admin/coaches', label: 'Coaches' },
    { to: '/admin/rooms', label: 'Rooms' },
    { to: '/admin/equipments', label: 'Equipments' },
    { to: '/admin/clients', label: 'Clients' },
    { to: '/admin/sessions', label: 'Sessions' }
  ];

  // Signal to hold the current URL
  currentUrl = signal('');

  constructor(private router: Router, private auth: AuthService) {
    // Set the initial URL
    this.currentUrl.set(this.router.url);

    // Listen to router events to update the URL signal upon navigation
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed() // Automatically unsubscribes when component is destroyed
      )
      .subscribe((event: any) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  handleLogOut() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}