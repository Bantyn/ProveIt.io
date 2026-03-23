import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Compition } from './compition';

describe('Compition', () => {
  let component: Compition;
  let fixture: ComponentFixture<Compition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Compition]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Compition);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
