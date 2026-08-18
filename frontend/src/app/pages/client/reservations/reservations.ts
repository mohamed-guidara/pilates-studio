import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

type BookingsTab = 'reservations' | 'waitings';

@Component({
  selector: 'app-client-reservations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css',
})
export class ClientReservations {
  activeTab = signal<BookingsTab>('reservations');

  setTab(tab: BookingsTab): void {
    this.activeTab.set(tab);
  }
}