import { Component } from '@angular/core';
import { Sidebar } from "../../../shared/components/sidebar/sidebar";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'admin-dashboard',
  imports: [Sidebar, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboard {}
