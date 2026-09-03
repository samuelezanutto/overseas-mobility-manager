import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationNew } from './application-new';

describe('ApplicationNew', () => {
  let component: ApplicationNew;
  let fixture: ComponentFixture<ApplicationNew>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationNew],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationNew);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
