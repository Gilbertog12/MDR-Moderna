import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StdjobTaskModalComponent } from './stdjob-task-modal.component';

describe('StdjobTaskModalComponent', () => {
  let component: StdjobTaskModalComponent;
  let fixture: ComponentFixture<StdjobTaskModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StdjobTaskModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StdjobTaskModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
