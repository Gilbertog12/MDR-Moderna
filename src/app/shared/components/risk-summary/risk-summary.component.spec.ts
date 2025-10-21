import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RiskSummaryComponent } from './risk-summary.component';

describe('RiskSummaryComponent', () => {
  let component: RiskSummaryComponent;
  let fixture: ComponentFixture<RiskSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RiskSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
