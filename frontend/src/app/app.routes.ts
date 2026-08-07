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

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {
    path: 'admin',
    component: AdminDashboard,
    children: [
      { path: '', component: WelcomePage },
      { path: 'coaches', component: Coaches,
      },

          // { path: 'coaches/create', component: CreateCoach},

      { path: 'rooms', component: Rooms },
      { path: 'equipments', component: Equipments },
      { path: 'sessions', component: Sessions },
      { path: 'clients', component: Clients },

    ],
  },
  { path: 'coach', component: CoachDashboard },
  { path: 'client', component: ClientDashboard },
  // {path: 'admin/coaches', component: Coaches},
  // {path: 'admin/rooms', component: Rooms},
  // {path: 'admin/equipments', component: Equipments},
  // {path: 'admin/clients', component: Coaches}
];
