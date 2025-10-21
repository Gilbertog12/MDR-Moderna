import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RiskEvaluationTabComponent } from './evaluation-risk-tab.component';

describe('EvaluationRiskTabComponent', () => {
  let component: RiskEvaluationTabComponent;
  let fixture: ComponentFixture<RiskEvaluationTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskEvaluationTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RiskEvaluationTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
