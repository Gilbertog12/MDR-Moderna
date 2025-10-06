import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RkmainComponent } from './rkmain.component';

describe('RkmainComponent', () => {
  let component: RkmainComponent;
  let fixture: ComponentFixture<RkmainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RkmainComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RkmainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
