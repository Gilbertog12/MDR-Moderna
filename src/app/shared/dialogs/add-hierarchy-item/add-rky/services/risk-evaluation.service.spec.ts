import { TestBed } from '@angular/core/testing';

import { RiskEvaluationService } from './risk-evaluation.service';

describe('RiskEvaluationService', () => {
  let service: RiskEvaluationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RiskEvaluationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
