import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StdjobTabComponent } from './stdjob-tab.component';

describe('StdjobTabComponent', () => {
  let component: StdjobTabComponent;
  let fixture: ComponentFixture<StdjobTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StdjobTabComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StdjobTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
