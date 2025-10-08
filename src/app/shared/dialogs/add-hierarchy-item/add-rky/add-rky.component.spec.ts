import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRkyComponent } from './add-rky.component';

describe('AddRkyComponent', () => {
  let component: AddRkyComponent;
  let fixture: ComponentFixture<AddRkyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddRkyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddRkyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
