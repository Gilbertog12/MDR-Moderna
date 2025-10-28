import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RkcDetalleComponent } from './rkc-detalle.component';

describe('RkcDetalleComponent', () => {
  let component: RkcDetalleComponent;
  let fixture: ComponentFixture<RkcDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RkcDetalleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RkcDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
