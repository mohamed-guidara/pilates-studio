import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SessionDetailModal } from '../session-detail/session-detail-modal';
import { SessionLevelPipe } from '../../../assets/session-level-pipe';
import { SessionCategoryPipe } from '../../../assets/session-category-pipe';
import { SessionVM } from '../../utils/session-enrichment.util';

export type CalendarViewMode = 'day' | 'week' | 'month';

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT_PX = 60;
// Changed from fixed pixels to a small percentage gap between overlapping columns
const DAY_BLOCK_GAP_PERCENT = 0.5;

interface CategoryColor {
  bg: string;
  border: string;
  text: string;
}

// One color per session category (1-5, matching the options used in
// create-session-modal / update-session). Add more entries here if you add categories.
export const CATEGORY_COLORS: Record<number, CategoryColor> = {
  1: { bg: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8' }, // blue
  2: { bg: '#EDE9FE', border: '#C4B5FD', text: '#6D28D9' }, // purple
  3: { bg: '#D1FAE5', border: '#6EE7B7', text: '#047857' }, // emerald
  4: { bg: '#FEF3C7', border: '#FCD34D', text: '#B45309' }, // amber
  5: { bg: '#FFE4E6', border: '#FDA4AF', text: '#BE123C' }, // rose
};
const DEFAULT_COLOR: CategoryColor = { bg: '#F3F4F6', border: '#D1D5DB', text: '#374151' };

interface DayLayoutItem {
  session: SessionVM;
  col: number;
  colCount: number;
}

@Component({
  selector: 'app-session-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink, SessionDetailModal, SessionLevelPipe, SessionCategoryPipe],
  templateUrl: './session-calendar.html',
  styleUrl: './session-calendar.css',
})
export class SessionCalendar implements OnInit, OnChanges {
  /** Already-enriched sessions (coachName/roomNumber/reservedCount) from the host page. */
  @Input() sessions: SessionVM[] = [];
  /** True for the admin page (full CRUD except delete); false/omitted for coaches (read-only). */
  @Input() isAdmin = false;
  /** The logged-in coach's coachId, used by the "show only my sessions" filter. */
  @Input() myCoachId: number | null = null;

  /** Admin only: parent should open its existing create-session modal in response. */
  @Output() createSessionRequested = new EventEmitter<void>();

  viewMode = signal<CalendarViewMode>('week');
  currentDate = signal<Date>(this.stripTime(new Date()));
  showOnlyMine = signal(false);

  showDetailModal = signal(false);
  selectedSession = signal<SessionVM | null>(null);

  hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  categoryLegend = Object.keys(CATEGORY_COLORS).map(Number);
  viewModes: CalendarViewMode[] = ['day', 'week', 'month'];

  ngOnInit(): void {
    this.showOnlyMine.set(!this.isAdmin);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isAdmin'] && !changes['isAdmin'].firstChange) {
      this.showOnlyMine.set(!this.isAdmin);
    }
  }

  toggleShowOnlyMine(): void {
    this.showOnlyMine.update((v) => !v);
  }

  requestCreate(): void {
    this.createSessionRequested.emit();
  }

  private scopedSessions(): SessionVM[] {
    if (this.showOnlyMine() && this.myCoachId !== null) {
      return this.sessions.filter((s) => s.coachId === this.myCoachId);
    }
    return this.sessions;
  }

  // ---------- Colors ----------

  categoryColor(category: number): CategoryColor {
    return CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
  }

  // ---------- Navigation ----------

  setViewMode(mode: CalendarViewMode): void {
    this.viewMode.set(mode);
  }

  goToday(): void {
    this.currentDate.set(this.stripTime(new Date()));
  }

  goPrev(): void {
    this.shiftCurrentDate(-1);
  }

  goNext(): void {
    this.shiftCurrentDate(1);
  }

  private shiftCurrentDate(direction: 1 | -1): void {
    const date = new Date(this.currentDate());
    if (this.viewMode() === 'day') {
      date.setDate(date.getDate() + direction);
    } else if (this.viewMode() === 'week') {
      date.setDate(date.getDate() + direction * 7);
    } else {
      date.setMonth(date.getMonth() + direction);
    }
    this.currentDate.set(date);
  }

  visibleRangeLabel(): string {
    const mode = this.viewMode();
    const date = this.currentDate();
    if (mode === 'day') {
      return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (mode === 'week') {
      const days = this.weekDays();
      const first = days[0];
      const last = days[days.length - 1];
      return `${first.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  // ---------- Date / layout helpers ----------

  private stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  weekDays(): Date[] {
    return this.buildWeek(this.currentDate());
  }

  dayViewDates(): Date[] {
    return [this.currentDate()];
  }

  monthWeeks(): Date[][] {
    return this.buildMonthGrid(this.currentDate());
  }

  private buildWeek(anchor: Date): Date[] {
    const day = anchor.getDay(); // 0 = Sunday
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  private buildMonthGrid(anchor: Date): Date[][] {
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = this.buildWeek(firstOfMonth)[0];
    const weeks: Date[][] = [];
    const cursor = new Date(gridStart);
    for (let w = 0; w < 6; w++) {
      const week = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(cursor);
        d.setDate(cursor.getDate() + i);
        return d;
      });
      weeks.push(week);
      cursor.setDate(cursor.getDate() + 7);
      if (week[6].getMonth() !== anchor.getMonth() && week[0].getMonth() !== anchor.getMonth()) {
        break;
      }
    }
    return weeks;
  }

  isSameMonth(date: Date): boolean {
    return date.getMonth() === this.currentDate().getMonth();
  }

  isToday(date: Date): boolean {
    return this.toDateKey(date) === this.toDateKey(new Date());
  }

  sessionsForDate(date: Date): SessionVM[] {
    const key = this.toDateKey(date);
    return this.scopedSessions()
      .filter((s) => s.date === key)
      .sort((a, b) => this.toMinutes(a.startTime) - this.toMinutes(b.startTime));
  }

  layoutForDate(date: Date): DayLayoutItem[] {
    const daySessions = this.sessionsForDate(date);
    const columns: SessionVM[][] = [];
    const colByIndex = new Map<number, number>();

    for (const s of daySessions) {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const last = columns[i][columns[i].length - 1];
        if (this.toMinutes(last.endTime) <= this.toMinutes(s.startTime)) {
          columns[i].push(s);
          colByIndex.set(s.sessionId, i);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([s]);
        colByIndex.set(s.sessionId, columns.length - 1);
      }
    }

    const colCount = columns.length || 1;
    return daySessions.map((s) => ({ session: s, col: colByIndex.get(s.sessionId) ?? 0, colCount }));
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  sessionTopPx(session: SessionVM): number {
    const minutes = this.toMinutes(session.startTime) - START_HOUR * 60;
    return Math.max(0, minutes) * (HOUR_HEIGHT_PX / 60);
  }

  sessionHeightPx(session: SessionVM): number {
    const minutes = this.toMinutes(session.endTime) - this.toMinutes(session.startTime);
    // Minimum tall enough to fit category, time, coach, and booked-count lines without clipping.
    return Math.max(80, minutes * (HOUR_HEIGHT_PX / 60));
  }

  gridHeightPx(): number {
    return (END_HOUR - START_HOUR) * HOUR_HEIGHT_PX;
  }

  hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
  }

  // ---------- Week view: sessions grouped per hour cell (chips, not absolute stacking) ----------

  hourCellSessions(date: Date, hour: number): SessionVM[] {
    return this.sessionsForDate(date).filter((s) => {
      const startHour = Math.floor(this.toMinutes(s.startTime) / 60);
      return startHour === hour;
    });
  }

  goToDayView(date: Date): void {
    this.currentDate.set(date);
    this.viewMode.set('day');
  }

  // ---------- Day view: percentage-based blocks, side-by-side for overlaps ----------

  sessionLeftPercent(item: DayLayoutItem): number {
    const columnWidth = (100 - (item.colCount - 1) * DAY_BLOCK_GAP_PERCENT) / item.colCount;
    return item.col * (columnWidth + DAY_BLOCK_GAP_PERCENT);
  }

  sessionWidthPercent(item: DayLayoutItem): number {
    return (100 - (item.colCount - 1) * DAY_BLOCK_GAP_PERCENT) / item.colCount;
  }

  // ---------- Detail modal (reuses the existing session-detail-modal) ----------

  openDetails(session: SessionVM): void {
    this.selectedSession.set(session);
    this.showDetailModal.set(true);
  }

  closeDetails(): void {
    this.showDetailModal.set(false);
  }
}