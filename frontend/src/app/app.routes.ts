import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Home } from './pages/home-page/home-page';
import { AdminDashboard } from './pages/admin/dashboard/dashboard';
import { ClientDashboard } from './pages/client/dashboard/dashboard';
import { CoachDashboard } from './pages/coach/dashboard/dashboard';
import { Coaches } from './pages/admin/coaches/coaches';
import { Rooms } from './pages/admin/rooms/rooms';
import { Equipments } from './pages/admin/equipments/equipments';
import { Sessions } from './pages/admin/sessions/sessions';
import { WelcomePage } from './pages/admin/welcome-page/welcome-page';
import { Clients } from './pages/admin/clients/clients';
import { CreateCoach } from './shared/components/create-coach/create-coach';
import { UpdateCoach } from './shared/components/update-coach/update-coach';
import { UpdateRoom } from './shared/components/update-room/update-room';
import { UpdateEquipment } from './shared/components/update-equipment/update-equipment';
import { UpdateClient } from './shared/components/update-client/update-client';
import { UpdateSession } from './shared/components/update-session/update-session';
import { Reservations } from './pages/admin/reservations/reservations';
import { Payments } from './pages/admin/payments/payments';
import { Waitings } from './pages/admin/waitings/waitings';
import { CoachSessions } from './pages/coach/sessions/sessions';
import { ClientSessions } from './pages/client/sessions/sessions';
import { ClientReservations } from './pages/client/reservations/reservations';
import { PaymentPage } from './pages/client/payment/payment';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {
    path: 'admin',
    component: AdminDashboard,
    children: [
      { path: '', component: WelcomePage },
      { path: 'coaches', component: Coaches },
      { path: 'coaches/update/:id', component: UpdateCoach },
      { path: 'rooms', component: Rooms },
      { path: 'rooms/update/:id', component: UpdateRoom },
      { path: 'equipments', component: Equipments },
      { path: 'equipments/update/:id', component: UpdateEquipment },
      { path: 'sessions', component: Sessions },
      { path: 'sessions/update/:id', component: UpdateSession },
      { path: 'clients', component: Clients },
      { path: 'clients/update/:id', component: UpdateClient },
      { path: 'reservations', component: Reservations },
      { path: 'payments', component: Payments },
      { path: 'waitings', component: Waitings },
    ],
  },
  {
    path: 'coach',
    component: CoachDashboard,
    children: [
      { path: '', redirectTo: 'sessions', pathMatch: 'full' },
      { path: 'sessions', component: CoachSessions },
    ],
  },
  {
    path: 'client',
    component: ClientDashboard,
    children: [
      { path: '', redirectTo: 'sessions', pathMatch: 'full' },
      { path: 'sessions', component: ClientSessions },
      { path: 'reservations', component: ClientReservations },
    ],
  },
  { path: 'payment/:reservationId', component: PaymentPage },
];