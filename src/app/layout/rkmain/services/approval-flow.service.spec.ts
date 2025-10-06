import { TestBed } from '@angular/core/testing';

import { ApprovalFlowService } from './approval-flow.service';

describe('ApprovalFlowService', () => {
  let service: ApprovalFlowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApprovalFlowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
