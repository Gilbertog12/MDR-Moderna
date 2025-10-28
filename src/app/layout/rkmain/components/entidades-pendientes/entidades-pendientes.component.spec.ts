import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntidadesPendientesComponent } from './entidades-pendientes.component';

describe('EntidadesPendientesComponent', () => {
  let component: EntidadesPendientesComponent;
  let fixture: ComponentFixture<EntidadesPendientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntidadesPendientesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntidadesPendientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
