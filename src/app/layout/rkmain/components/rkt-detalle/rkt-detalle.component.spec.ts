import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RktDetalleComponent } from './rkt-detalle.component';

describe('RktDetalleComponent', () => {
  let component: RktDetalleComponent;
  let fixture: ComponentFixture<RktDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RktDetalleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RktDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
