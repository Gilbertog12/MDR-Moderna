import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HierarchyDetailComponent } from './hierarchy-detail.component';

describe('HierarchyDetailComponent', () => {
  let component: HierarchyDetailComponent;
  let fixture: ComponentFixture<HierarchyDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HierarchyDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HierarchyDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
