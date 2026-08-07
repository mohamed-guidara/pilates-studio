import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

   currentUser = { isSuperAdmin: true }; // replace with actual user from your auth service

  navItems = [
    { to: '/admin/coaches', label: 'Coaches', },
    { to: '/admin/rooms', label: 'Rooms' },
    { to: '/admin/equipments', label: 'Equipments' },
    { to: '/admin/clients', label: 'Clients' },
    { to: '/admin/sessions', label: 'Sessions' }
  ];

  constructor(private router: Router,
              private auth: AuthService,

  ) {}

  handleLogOut() {
    this.auth.logout()
    this.router.navigate(['/login'])
  }

}
