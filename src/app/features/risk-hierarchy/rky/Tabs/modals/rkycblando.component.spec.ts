import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RkycblandoComponent } from './rkycblando.component';

describe('RkycblandoComponent', () => {
  let component: RkycblandoComponent;
  let fixture: ComponentFixture<RkycblandoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RkycblandoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RkycblandoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
