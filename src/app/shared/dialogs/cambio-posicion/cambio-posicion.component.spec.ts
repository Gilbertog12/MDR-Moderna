import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CambioPosicionComponent } from './cambio-posicion.component';

describe('CambioPosicionComponent', () => {
  let component: CambioPosicionComponent;
  let fixture: ComponentFixture<CambioPosicionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CambioPosicionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CambioPosicionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
