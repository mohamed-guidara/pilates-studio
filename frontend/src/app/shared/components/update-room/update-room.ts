import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Room } from '../../models/room.model';
import { RoomService } from '../../../services/roomService.service';
import { FeedbackMessage } from '../feedback-message/feedback-message';

@Component({
  selector: 'update-room',
  standalone: true,
  imports: [FormsModule, RouterLink, FeedbackMessage],
  templateUrl: './updateRoom.html',
})
export class UpdateRoom implements OnInit {
  roomId = -1;
  room = signal<Room | null>(null);
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private roomService: RoomService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      const id = Number(rawId);
      if (id > 0) {
        this.roomId = id;
        this.loadRoom(id);
      } else {
        this.pageErrorMessage.set('Invalid room id.');
      }
    });
  }

  private loadRoom(id: number) {
    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.roomService.getRoom(id).subscribe({
      next: (room) => this.room.set(room),
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load room data.');
        console.error('Error loading room:', err);
      },
    });
  }

  updateRoomField<K extends keyof Room>(key: K, value: Room[K]) {
    const current = this.room();
    if (current) {
      this.room.set({ ...current, [key]: value });
    }
  }

  saveRoom() {
    const room = this.room();
    if (!room) {
      this.pageErrorMessage.set('Unable to save. Room data is not loaded.');
      return;
    }

    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.roomService.updateRoom(room.roomId, {
      number: room.number,
      capacity: room.capacity,
      isAvailable: room.isAvailable,
    }).subscribe({
      next: () => {
        this.router.navigate(['/admin/rooms'], {
          queryParams: { success: 'Room updated successfully.' },
          replaceUrl: true,
        });
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not update room. Please try again.');
        console.error('Error updating room:', err);
      },
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
