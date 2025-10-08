import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddHierarchyItemComponent } from './add-hierarchy-item.component';

describe('AddHierarchyItemComponent', () => {
  let component: AddHierarchyItemComponent;
  let fixture: ComponentFixture<AddHierarchyItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddHierarchyItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddHierarchyItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
