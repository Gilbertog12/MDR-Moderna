import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RksComponent } from './rks.component';

describe('RksComponent', () => {
  let component: RksComponent;
  let fixture: ComponentFixture<RksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
