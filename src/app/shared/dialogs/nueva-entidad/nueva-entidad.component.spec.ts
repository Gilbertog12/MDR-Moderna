import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaEntidadComponent } from './nueva-entidad.component';

describe('NuevaEntidadComponent', () => {
  let component: NuevaEntidadComponent;
  let fixture: ComponentFixture<NuevaEntidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaEntidadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevaEntidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
