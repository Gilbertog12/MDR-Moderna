import { TestBed } from '@angular/core/testing';

import { HierarchyDataService } from './hierarchy-data.service';

describe('HierarchyDataService', () => {
  let service: HierarchyDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HierarchyDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
