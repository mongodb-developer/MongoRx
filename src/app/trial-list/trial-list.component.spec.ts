import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrialListComponent } from './trial-list.component';

describe('TrialListComponent', () => {
  let component: TrialListComponent;
  let fixture: ComponentFixture<TrialListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TrialListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TrialListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
