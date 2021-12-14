import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeViewDialogComponent } from './code-view-dialog.component';

describe('CodeViewDialogComponent', () => {
  let component: CodeViewDialogComponent;
  let fixture: ComponentFixture<CodeViewDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CodeViewDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CodeViewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
