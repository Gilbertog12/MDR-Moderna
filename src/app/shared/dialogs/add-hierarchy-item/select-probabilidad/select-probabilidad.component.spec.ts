import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectProbabilidadComponent } from './select-probabilidad.component';

describe('SelectProbabilidadComponent', () => {
  let component: SelectProbabilidadComponent;
  let fixture: ComponentFixture<SelectProbabilidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectProbabilidadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectProbabilidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
