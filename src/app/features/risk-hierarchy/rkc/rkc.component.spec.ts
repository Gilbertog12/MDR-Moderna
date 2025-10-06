import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RkcComponent } from './rkc.component';

describe('RkcComponent', () => {
  let component: RkcComponent;
  let fixture: ComponentFixture<RkcComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RkcComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RkcComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
