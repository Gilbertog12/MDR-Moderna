import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RkyControlesBlandosComponent } from './rky-controles-blandos.component';

describe('RkyControlesBlandosComponent', () => {
  let component: RkyControlesBlandosComponent;
  let fixture: ComponentFixture<RkyControlesBlandosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RkyControlesBlandosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RkyControlesBlandosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
