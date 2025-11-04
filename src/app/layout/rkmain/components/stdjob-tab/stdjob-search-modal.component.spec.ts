import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StdjobSearchModalComponent } from './stdjob-search-modal.component';

describe('StdjobSearchModalComponent', () => {
  let component: StdjobSearchModalComponent;
  let fixture: ComponentFixture<StdjobSearchModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StdjobSearchModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StdjobSearchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
