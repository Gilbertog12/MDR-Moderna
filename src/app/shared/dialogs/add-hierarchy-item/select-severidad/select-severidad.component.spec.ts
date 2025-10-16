import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectSeveridadComponent } from './select-severidad.component';

describe('SelectSeveridadComponent', () => {
  let component: SelectSeveridadComponent;
  let fixture: ComponentFixture<SelectSeveridadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectSeveridadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectSeveridadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
