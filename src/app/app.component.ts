import { Apollo, gql } from 'apollo-angular';
import { Component, ViewEncapsulation, OnInit, OnDestroy } from '@angular/core';
import { debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { FormBuilder, FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { SearchTermService } from "./services/search-term.service";

import match from 'autosuggest-highlight/match';
import parse from 'autosuggest-highlight/parse';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None // allows innerHTML injections to use styles
})

export class AppComponent implements OnInit, OnDestroy {
  currentRoute: string;
  title = 'MongoRx';
  navLinks: any[];
  trialsHolder: Observable<any[]>;
  drugsHolder: Observable<any[]>;
  activeLinkIndex = -1;
  drugControl: FormControl;
  trialControl: FormControl;
  searchTermSubscription: Subscription | undefined;

  //----------------
  // GraphQL queries
  //----------------
  FIND_TRIALS = gql`
    query FindTrials($searchInput: AutoCompleteInput!) {
      autocomplete(input: $searchInput) {
        nct_id
        brief_title
        nct_title
        score
        highlights {
          texts {
            type
            value
          }
        }
      }
    }
  `;
  
  FIND_DRUGS = gql`
    query FindDrugs($searchInput: DrugAutoCompleteInput!) {
      drugAutocomplete(input: $searchInput) {
        openfda {
          brand_name
          generic_name
          manufacturer_name
        }
        score
        highlights {
          texts {
            type
            value
          }
        }
      }
    }
  `;

  searchVariables = {
    "searchInput": {
      "skip": "0",
      "limit": "5",
      "term": ""   // e.g., "arthritis"
      //"filters": [""] // e.g., ["condition=Neoplasms","intervention=procedure"]
    }
  };

  searchBox = this.formBuilder.group({
    drugControl: '',
    trialControl: ''
  });

  onSubmit(): void {
    if (this.currentRoute.startsWith("/drugs")) {
      console.log(`Search for '${this.drugControl.value}' on ${this.currentRoute}`);
      this.router.navigate(['/drugs'], { queryParams: {q: this.drugControl.value }});
    } else {
      console.log(`Search for '${this.trialControl.value}' on ${this.currentRoute}`);
      this.router.navigate(['/trials'], { queryParams: {q: this.trialControl.value }});
    }
  }

  constructor(
    private router: Router,
    private apollo: Apollo,
    private searchTermService: SearchTermService,
    private formBuilder: FormBuilder) {
      router.events.subscribe(event => {
        // keep track of the current page -- use it in onSubmit()
        if (event instanceof NavigationEnd) {
          this.currentRoute = event.url;          
        }
      });

      // input
      this.drugControl = new FormControl();
      this.trialControl = new FormControl();

      this.trialsHolder = this.trialControl.valueChanges
        .pipe(
        //startWith(''),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(val => {
          return this.filterTrials(val || '')
        })
      );
      this.drugsHolder = this.drugControl.valueChanges
        .pipe(
        //startWith(''),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(val => {
          console.log(`Drug val: ${val}`);
          return this.filterDrugs(val || '')
        })
      );

      this.navLinks = [{
        label: 'Dashboard',
        link: './dashboard',
        index: 0
      }, {
        label: 'Trials',
        link: './trials',
        index: 1
      }, {
        label: 'Drugs',
        link: './drugs',
        index: 1
      }];
  }

  ngOnInit(): void {
    this.router.events.subscribe((res) => {
      this.activeLinkIndex = this.navLinks.indexOf(this.navLinks.find(tab => tab.link === '.' + this.router.url));
    });
    this.searchTermSubscription = this.searchTermService.currentTerm.subscribe(term => {
      this.searchVariables.searchInput.term = term;
      this.drugControl.setValue(term);
      this.trialControl.setValue(term);
    });
  }

  ngOnDestroy() {
    this.searchTermSubscription?.unsubscribe();
  }

  filterDrugs(val: string) : Observable<any[]> {
    console.log(`Filtering drug val: ${val}`);
    this.searchVariables.searchInput.term = val;

    // call the function which makes graphQL request
    if (val.length > 1) {
      return this.apollo.watchQuery({
        query: this.FIND_DRUGS,
        variables: this.searchVariables
      }).valueChanges.pipe(map(({data}) => {
        let retVal = (data as any);
        return retVal.drugAutocomplete;
      }));
    } else {
      return new Observable;
    }
  }

  filterTrials(val: string) : Observable<any[]> {
    this.searchVariables.searchInput.term = val;

    // call the function which makes graphQL request
    if (val.length > 1) {
      return this.apollo.watchQuery({
        query: this.FIND_TRIALS,
        variables: this.searchVariables
      }).valueChanges.pipe(map(({data}) => {
        let retVal = (data as any);
        return retVal.autocomplete;
      }));
    } else {
      return new Observable;
    }
  }

  renderOption(option: any) {
    let matches;
    let parts;
    if (this.currentRoute.startsWith("/drugs")) {
      matches = match(option.openfda.brand_name, this.drugControl.value);
      parts = parse(option.openfda.brand_name, matches);
    } else {
      matches = match(option.nct_title ? option.nct_title : option.brief_title, this.trialControl.value);
      parts = parse(option.nct_title ? option.nct_title : option.brief_title, matches);
    }

    let hlTitle = "";
    parts.map((part: any) => {
      hlTitle += ('<span>' + 
        (part.highlight ? '<b>' : '') +
        part.text +
        (part.highlight ? '</b>' : '') +
        '</span'
      );
    });

    /**
     * Atlas Search highlights version -- inconsistent highlights returned
     *
    let hlTitle = "";
    if (option?.highlights?.length > 0) {
      let texts = option.highlights[0].texts;
      texts.map((text: any) => {
        hlTitle += ('<span>' + 
          (text.type === 'hit' ? '<b>' : '') +
          text.value +
          (text.type === 'hit' ? '</b>' : '') +
          '</span'
        );
      });
    }*/
    
    //console.log(hlTitle);
    return hlTitle;
  }
}
