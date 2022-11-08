import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class SearchTermService {

  private searchTerm = new BehaviorSubject('');  // default
  currentTerm = this.searchTerm.asObservable();
  private useVector = new BehaviorSubject(false);
  currentVector = this.useVector.asObservable();

  constructor() { }

  changeTerm(newTerm: string) {
    this.searchTerm.next(newTerm);
  }

  changeVector(newState: boolean) {
    this.useVector.next(newState);
  }

}