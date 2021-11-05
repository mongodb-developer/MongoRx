import { TestBed } from '@angular/core/testing';

import { SearchTermService } from './search-term.service';

describe('SearchTermService', () => {
  let service: SearchTermService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchTermService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
