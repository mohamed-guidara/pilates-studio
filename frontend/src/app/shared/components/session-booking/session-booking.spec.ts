import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionBooking } from './session-booking';

describe('SessionBooking', () => {
  let component: SessionBooking;
  let fixture: ComponentFixture<SessionBooking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionBooking],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionBooking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
