import { TestBed } from '@angular/core/testing';

import { ChecklistCopyPasteService } from './checklist-copy-paste.service';

describe('ChecklistCopyPasteService', () => {
  let service: ChecklistCopyPasteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChecklistCopyPasteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
