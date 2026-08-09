import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Client } from '../../../shared/models/client.model';
import { ClientService } from '../../../services/clientService.service';
import { PersonsService } from '../../../services/personService.service';
import { Person } from '../../../shared/models/person.model';
import { FeedbackMessage } from '../../../shared/components/feedback-message/feedback-message';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, RouterLink, FeedbackMessage],
  templateUrl: './clients.html',
  styleUrls: ['./clients.css'],
})
export class Clients implements OnInit {
  isLoading = signal(true);
  clients = signal<(Client & { person?: Person })[]>([]);

  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private clientService: ClientService,
    private personsService: PersonsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.pageErrorMessage.set(null);
    this.isLoading.set(true);

    this.clientService.getClients().pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (clients) => {
        this.personsService.getPersons().subscribe({
          next: (persons) => {
            this.clients.set(
              clients.map((client) => ({
                ...client,
                person: persons.find((person) => person.personId === client.personId),
              }))
            );
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load client person data.');
            console.error('Error loading persons:', err);
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load clients. Please refresh the page.');
        console.error('Error loading clients:', err);
        this.cdr.detectChanges();
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

