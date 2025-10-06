import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeSidebarComponent } from './tree-sidebar.component';

describe('TreeSidebarComponent', () => {
  let component: TreeSidebarComponent;
  let fixture: ComponentFixture<TreeSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreeSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
