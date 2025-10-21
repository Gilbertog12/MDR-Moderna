import { TestBed } from '@angular/core/testing';

import { RiskEvaluationConfigFactoryService } from './risk-evaluation-config.factory.service';

describe('RiskEvaluationConfigFactoryService', () => {
  let service: RiskEvaluationConfigFactoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RiskEvaluationConfigFactoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
