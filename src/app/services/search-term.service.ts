import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class SearchTermService {

  private searchTerm = new BehaviorSubject('');  // default
  currentTerm = this.searchTerm.asObservable();

  constructor() { }

  changeTerm(newTerm: string) {
    this.searchTerm.next(newTerm)
  }
}