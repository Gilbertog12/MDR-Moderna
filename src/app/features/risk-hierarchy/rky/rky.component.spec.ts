import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RkyComponent } from './rky.component';

describe('RkyComponent', () => {
  let component: RkyComponent;
  let fixture: ComponentFixture<RkyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RkyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RkyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
