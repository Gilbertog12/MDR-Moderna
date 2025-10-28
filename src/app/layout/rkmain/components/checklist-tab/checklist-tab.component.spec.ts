import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistTabComponent } from './checklist-tab.component';

describe('ChecklistTabComponent', () => {
  let component: ChecklistTabComponent;
  let fixture: ComponentFixture<ChecklistTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChecklistTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
