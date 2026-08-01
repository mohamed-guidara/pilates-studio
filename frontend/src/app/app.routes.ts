import { Routes } from '@angular/router';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Home } from './pages/home-page/home-page';
import { AdminDashboard } from './pages/admin/dashboard/dashboard';
import { ClientDashboard } from './pages/client/dashboard/dashboard';
import { CoachDashboard } from './pages/coach/dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {path: 'admin', component: AdminDashboard},
  {path: 'coach', component: CoachDashboard},
  {path: 'client', component: ClientDashboard}


];
