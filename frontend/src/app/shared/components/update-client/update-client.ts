import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Client } from '../../models/client.model';
import { Person } from '../../models/person.model';
import { ClientService } from '../../../services/clientService.service';
import { PersonsService } from '../../../services/personService.service';
import { FeedbackMessage } from '../feedback-message/feedback-message';

@Component({
  selector: 'update-client',
  standalone: true,
  imports: [FormsModule, RouterLink, FeedbackMessage],
  templateUrl: './updateClient.html',
})
export class UpdateClient implements OnInit {
  clientId = -1;
  client = signal<Client | null>(null);
  clientPerson = signal<Person | null>(null);
  password = signal(''); // API requires password, empty if unchanged
  pageErrorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private clientService: ClientService,
    private personsService: PersonsService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      const id = Number(rawId);
      if (id > 0) {
        this.clientId = id;
        this.loadClient(id);
      } else {
        this.pageErrorMessage.set('Invalid client id.');
      }
    });
  }

  private loadClient(id: number) {
    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.clientService.getClient(id).subscribe({
      next: (c) => {
        this.client.set(c);
        this.personsService.getPerson(c.personId).subscribe({
          next: (p) => this.clientPerson.set(p),
          error: (err) => {
            this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load client person data.');
            console.error('Error loading person:', err);
          },
        });
      },
      error: (err) => {
        this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Unable to load client data.');
        console.error('Error loading client:', err);
      },
    });
  }

  updatePersonField<K extends keyof Person>(key: K, value: Person[K]) {
    const current = this.clientPerson();
    if (current) this.clientPerson.set({ ...current, [key]: value });
  }

  updateClientField<K extends keyof Client>(key: K, value: Client[K]) {
    const current = this.client();
    if (current) this.client.set({ ...current, [key]: value });
  }

  saveClient() {
    const client = this.client();
    const clientPerson = this.clientPerson();
    if (!client || !clientPerson) {
      this.pageErrorMessage.set('Unable to save. Client data is not loaded.');
      return;
    }

    this.pageErrorMessage.set(null);
    this.successMessage.set(null);

    this.personsService
      .updatePerson(clientPerson.personId, {
        ...clientPerson,
        password: this.password() || '',
      })
      .subscribe({
        next: (updatedPerson) => {
          this.clientPerson.set(updatedPerson);

          this.clientService
            .updateClient(client.clientId, {
              personId: clientPerson.personId,
              level: client.level,
            })
            .subscribe({
              next: (updatedClient) => {
                this.client.set(updatedClient);
                this.router.navigate(['/admin/clients'], {
                  queryParams: { success: 'Client updated successfully.' },
                  replaceUrl: true,
                });
              },
              error: (err) => {
                this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not update client. Please try again.');
                console.error('Error updating client:', err);
              },
            });
        },
        error: (err) => {
          this.pageErrorMessage.set(this.extractErrorMessage(err) || 'Could not update client personal details. Please try again.');
          console.error('Error updating person:', err);
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
