import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RkrComponent } from './rkr.component';

describe('RkrComponent', () => {
  let component: RkrComponent;
  let fixture: ComponentFixture<RkrComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RkrComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RkrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
