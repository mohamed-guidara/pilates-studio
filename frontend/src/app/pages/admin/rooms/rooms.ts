import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RoomService } from '../../../services/roomService.service';
import { Room } from '../../../shared/models/room.model';
import { CreateRoom } from '../../../shared/components/create-room/create-room';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, CreateRoom, RouterLink, FeedbackMessage],
  templateUrl: './rooms.html',
  styleUrl: './rooms.css',
})
export class Rooms implements OnInit {
  isLoading = signal(true);
  rooms = signal<Room[]>([]);

  showCreateModal = signal(false);
  createErrorMessage = signal<string | null>(null);
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private router: Router,
    private roomService: RoomService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadRooms();
  }

  loadRooms() {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    this.roomService.getRooms().pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load rooms. Please refresh the page.');
        console.error('Error loading rooms:', err);
        this.cdr.detectChanges();
      }
    });
  }

  createRoom() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.createErrorMessage.set(null);
    this.showCreateModal.set(false);
  }

  handleCreate(newRoom: { number: string; capacity: number; isAvailable: number }) {
    this.createErrorMessage.set(null);
    this.pageErrorMessage.set(null);

    this.roomService.createRoom(newRoom).subscribe({
      next: () => {
        this.successMessage.set('Room created successfully.');
        this.showCreateModal.set(false);
        this.loadRooms();
      },
      error: (err) => {
        this.createErrorMessage.set(this.extractErrorMessage(err) || 'Could not create room. Please try again.');
        console.error('Error creating room:', err);
      }
    });
  }

  deleteRoom(id: number) {
    if (!confirm('Delete this room?')) {
      return;
    }

    this.roomService.deleteRoom(id).subscribe({
      next: () => {
        this.successMessage.set('Room deleted successfully.');
        this.loadRooms();
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not delete room. Please try again.');
        console.error('Error deleting room:', err);
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

