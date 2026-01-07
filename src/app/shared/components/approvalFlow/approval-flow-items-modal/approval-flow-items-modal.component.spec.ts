import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalFlowItemsModalComponent } from './approval-flow-items-modal.component';

describe('ApprovalFlowItemsModalComponent', () => {
  let component: ApprovalFlowItemsModalComponent;
  let fixture: ComponentFixture<ApprovalFlowItemsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalFlowItemsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalFlowItemsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
