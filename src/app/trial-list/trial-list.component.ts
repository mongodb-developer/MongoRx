import { Apollo, gql } from 'apollo-angular';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { faFlask, faMedkit, faPlus, faStethoscope, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { noop as _noop } from 'lodash-es';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { SearchTermService } from "../services/search-term.service";
import { Subscription, Observable } from 'rxjs';
import { CodeViewDialog } from '../code-view-dialog/code-view-dialog.component';
import { DocumentNode } from 'graphql';

@Component({
  selector: 'app-trial-list',
  templateUrl: './trial-list.component.html',
  styleUrls: ['./trial-list.component.css', '../styles/common.css']
})

export class TrialListComponent implements OnInit, OnDestroy {
  trialsLoading: boolean = false;
  facetsLoading: boolean = false;
  trials: any;
  facets: any;
  filter$: Observable<string | string[] | null>;
  private trialQuerySubscription: Subscription | undefined;
  private facetQuerySubscription: Subscription | undefined;
  private searchQuerySubscription: Subscription | undefined;
  private searchTermSubscription: Subscription | undefined;

  //----------------
  // infinite scroll
  //----------------
  limit: number = 1000; // how many before performance degrades?
  handleScroll = (scrolled: boolean) => {
    //console.timeEnd(`${scrolled}: lastScrolled`);
    scrolled ? this.getData() : _noop();
    //console.time('lastScrolled');
  }

  hasMore = () => {
    return this.trials || this.trials?.length < this.limit;
  }

  getData() {
    //console.log(`getting data`);
    this.searchVariables.searchInput.skip = (Number(this.searchVariables.searchInput.skip) + 12).toString();
    this.doSearch(true, "from getData");
  }

  //----------------
  // GraphQL queries
  //----------------
  FIND_TRIALS = gql`query FindTrials($searchInput: SearchInput!) {
  search(input: $searchInput) {
    nct_id
    brief_title
    start_date
    completion_date
    condition
    intervention
    intervention_mesh_term
    sponsors { agency }
    status
    phase
    highlights { 
      texts { type value }
    }
    score
    count { total }
  }
}`;

  GET_FACETS = gql`query GetFacets($facetInput: FacetInput!) {
  facets(input: $facetInput) {
    completion_date { count name }
    conditions { count name }
    drugs { count name }
    genders { count name }
    intervention_types { count name }
    interventions { count name }
    sponsors { count name }
    start_date { count name }
  }
}`;

  facetVariables = {
    "facetInput": {
      "term": "",   // e.g., "cancer"
      "countOnly": false,
      "filters": [] as string[] // e.g., ["condition=Neoplasms","intervention=procedure"]
    }
  };

  searchVariables = {
    "searchInput": {
      "skip": "0",
      "limit": "12",
      "term": "",   // e.g., "arthritis"
      "filters": [] as string[]
    }
  };

  // font-awesome icons
  faStethoscope = faStethoscope;
  faPlus = faPlus;
  faFlask = faFlask;
  faMedkit = faMedkit;
  faUserPlus = faUserPlus;

  selectable = true;
  removable = true;
  toggle = true;
  objectKeys = Object.keys;
  objectValues = Object.values;
  trimTS(timestamp: string) : string {
    return timestamp.substring(0, timestamp.indexOf("+0000 UTC")-1).replace(" ", "T");
  }

  //------------
  // facet filters
  //------------
  conditionFilters: any[]    = [];
  interventionFilters: any[] = [];
  productFilters: any[]      = [];
  sponsorFilters: any[]      = [];
  genderFilters: any[]       = [];
  statusFilters: any[]       = [];
  facetFilters: string[]     = [];
  startDateFilters: string[] = [];

  updateFacetFilters() : void {
    let allFilters = this.conditionFilters
      .concat(this.interventionFilters)
      .concat(this.genderFilters)
      .concat(this.sponsorFilters)
      .concat(this.productFilters)
      .concat(this.statusFilters)
      .concat(this.startDateFilters); // TODO: add more?
    console.log(`All filters: ${JSON.stringify(allFilters)}`);
    let queryStringFilters = new Set<string>();
    allFilters.map((filter) => {
      Object.keys(filter).map((key) => {
        queryStringFilters.add(`${key}:${filter[key]}`);
      });
    });
    this.searchVariables.searchInput.filters = Array.from(queryStringFilters);
    this.searchVariables.searchInput.skip = "0";
    //console.log(`Query filters: ${JSON.stringify(this.searchVariables.searchInput.filters)}`);
    this.doSearch(false, "from updateFacetFilters");

    this.facetVariables.facetInput.filters = this.searchVariables.searchInput.filters;
    this.getFacets();
  }

  onConditionFacetClicked(facetName: string): void {
    let added = this.addFilter({condition: facetName}, this.conditionFilters);
    if (added === -1) this.updateFacetFilters();
  }

  onInterventionFacetClicked(facetName: string): void {
    let added = this.addFilter({intervention: facetName}, this.interventionFilters);
    if (added === -1) this.updateFacetFilters();
  }

  onProductFacetClicked(facetName: string): void {
    let added = this.addFilter({intervention_mesh_term: facetName}, this.productFilters);
    if (added === -1) this.updateFacetFilters();
  }

  onSponsorFacetClicked(facetName: string): void {
    let added = this.addFilter({"sponsors.agency": ("\"" + facetName + "\"")}, this.sponsorFilters);
    if (added === -1) this.updateFacetFilters();
  }

  onStatusFacetClicked(facetName: string): void {
    let added = this.addFilter({"status": ("\"" + facetName + "\"")}, this.statusFilters);
    if (added === -1) this.updateFacetFilters();
  }

  onStartDateFacetClicked(facetName: string): void {
    let added = this.addFilter({"start_date": ("\"" + facetName + "\"")}, this.startDateFilters);
    if (added === -1) this.updateFacetFilters();
  }

  onGenderFacetClicked(facetName: string): void {
    let added = this.addFilter({gender: facetName}, this.genderFilters);
    if (added === -1) this.updateFacetFilters();
  }

  /**
   * A crude Set-like unique object constraints on an array.
   * If `filterToAdd` is already present in array, returns >= 0
   * otherwise, `filterToAdd` is added to array and returns -1
   */
  addFilter(filterToAdd: any, filtersToAddTo: any[]): number {
    let index = filtersToAddTo.findIndex((filter) => {
      return this.shallowEqual(filter, filterToAdd);
    });
    if (index === -1) {
      filtersToAddTo.push(filterToAdd);
      console.log(`Adding ${JSON.stringify(filterToAdd)} to url params`)
      this.router.navigate(
        [], 
        {
          relativeTo: this.activatedRoute,
          queryParams: filterToAdd, 
          queryParamsHandling: 'merge'
        });
      }
    return index;
  }

  removeFilter(filterToRemove: any, filtersToRemoveFrom: any[]): void {
    let index = filtersToRemoveFrom.findIndex((filter) => {
      return this.shallowEqual(filter, filterToRemove);
    });
    filtersToRemoveFrom.splice(index, 1);
    this.onFiltersChanged(filtersToRemoveFrom);

    let filterField = this.objectKeys(filterToRemove)[0];
    console.log(`Key to remove: ${filterField}`);
    console.log(JSON.stringify({[filterField] : null}));
    this.router.navigate(
      [], 
      {
        relativeTo: this.activatedRoute,
        queryParams: {[filterField] : null}, 
        queryParamsHandling: 'merge'
      });
  }

  removeSearchTermAndFilters(): void {
    this.searchVariables.searchInput.term = "";
    this.searchVariables.searchInput.filters = [];
    this.facetVariables.facetInput.term = "";
    this.facetVariables.facetInput.filters = [];
    const queryParams: Params = {
      //q: ""
    };

    this.router.navigate(
      [], 
      {
        relativeTo: this.activatedRoute,
        queryParams: queryParams, 
        //queryParamsHandling: 'merge', // 'merge' is default, remove to replace all query params by provided
      });

    this.searchTermService.changeTerm("");
  }

  onClearAll(): void {
    this.removeSearchTermAndFilters();
    
    // clear all filters
    this.conditionFilters = [];
    this.interventionFilters = [];
    this.genderFilters = [];
    this.sponsorFilters = [];
    this.productFilters = [];
    this.statusFilters = [];
    this.startDateFilters = [];

    // update total count
    this.updateFacetFilters();
  }

  shallowEqual(object1: object, object2: object): boolean {
    return JSON.stringify(object1) === JSON.stringify(object2);
  }

  onFiltersChanged(filters: any[]): void {
    this._cdr.detectChanges();
    this.updateFacetFilters();
  }

  // utility function to be used in *ngIf expressions
  isArray(obj: any) {
    return Array.isArray(obj)
  }

  // utility function for formatting search results
  titleCase(str: string): string {
    const lowers = ["a", "and", "at", "by", "in", "for", "or", "of", "over", "the", "to"];
    return str.split(' ').map(function (word, index) {
      if (word === "A" && index === 0) {
        return word;  // special case, title beginning with "A ..."
      }
      let lw = word.toLowerCase();
      if (lowers.indexOf(lw) >= 0) return lw;
      if (word.indexOf('-') >= 0) return word;
      return (lw.charAt(0).toUpperCase() + word.slice(1));
    }).join(' ');
  }

  openDialog(which: string): void {
    let data = {
      gqlQuery: which == 'facets' ? this.getGqlString(this.GET_FACETS) : this.getGqlString(this.FIND_TRIALS),
      gqlQueryTitle: "GraphQL Query",
      gqlVars: JSON.stringify(which == 'facets' ? this.facetVariables : this.searchVariables, null, 2),
      gqlQueryLang: "graphql",
      gqlVarsTitle: "Query Variables",
      gqlVarsLang: "json"
    }
    const dialogRef = this.dialog.open(CodeViewDialog, {
      width: '50%',
      data: data
    });

    /*
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      console.log(result);
    });
    */
  }

  getGqlString(doc: DocumentNode): string | undefined {
    return doc.loc && doc.loc.source.body;
  }

  constructor(
    private apollo: Apollo,
    private _cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private searchTermService: SearchTermService,
    private dialog: MatDialog) {
  }

  ngOnInit() {
    this.searchTermSubscription = this.searchTermService.currentTerm.subscribe(term => {
      this.searchVariables.searchInput.term = term;
      this.facetVariables.facetInput.term = term;
    });

    this.filter$ = this.activatedRoute.queryParamMap.pipe(
      // TODO: q param should only use params.get. Facets can use getAll
      map((params: ParamMap) => {
        let keys = params.keys;
        if (keys.length === 0) {
          // no params -- clear filters
          this.trials = []; // force facet re-count
          this.onClearAll();
          return null;
        } else {
          // existing query params -- add new ones
          let qParam = "";
          if (keys.indexOf("q") >= 0) {
            qParam += `q=${params.get('q')}`;
          } else {
            qParam += `q=`;
          }
          if (keys.indexOf("condition") >= 0) {
            qParam += `|condition=${params.get('condition')}`
          }
          if (keys.indexOf("intervention_mesh_term") >= 0) {
            qParam += `|intervention_mesh_term=${params.get('intervention_mesh_term')}`
          }
          if (keys.indexOf("intervention") >= 0) {
            qParam += `|intervention=${params.get('intervention')}`
          }
          if (keys.indexOf("sponsors.agency") >= 0) {
            qParam += `|sponsors.agency=${params.get('sponsors.agency')}`
          }
          if (keys.indexOf("gender") >= 0) {
            qParam += `|gender=${params.get('gender')}`
          }
          if (keys.indexOf("status") >= 0) {
            qParam += `|status=${params.get('status')}`
          }
          if (keys.indexOf("start_date") >= 0) {
            qParam += `|start_date=${params.get('start_date')}`
          }
          return qParam;
        }
      }) // TODO: add filters, skip, limit?
    );

    this.filter$.subscribe(param => {
      this.onQueryParamChange(param);
    });

    // load initial set
    this.getFacets();
    //this.doSearch(true, "ngOnInit");
  }

  onQueryParamChange(queryParam: string | string[] | null): void {
    //console.log(`Current term: ${this.searchVariables.searchInput.term}\nParam: ${param}`);
    if (queryParam) {
      if (typeof queryParam === "string" && queryParam?.trim().length > 0) {
        let params = queryParam.split("|");
        if (params && params.length > 0) {
          for (let param of params) {
            let kv = param.split("=");
            let key = kv[0];
            let value = kv[1];
            if (key === "q" && value.trim().length > 0 && value.trim() !== "null") {
              if (this.searchVariables.searchInput.term != value) {
                this.searchVariables.searchInput.term = value || '';
                this.facetVariables.facetInput.term = value || '';
              } else {
                console.log("ngOnInit param unchanged")
              }
            } else if (key === "condition") {
              this.addFilter({[key]: value}, this.conditionFilters);
            } else if (key === "intervention_mesh_term") {
              this.addFilter({[key]: value}, this.productFilters);
            } else if (key === "intervention") {
              this.addFilter({[key]: value}, this.interventionFilters);
            } else if (key === "sponsors.agency") {
              this.addFilter({[key]: value}, this.sponsorFilters);
            } else if (key === "gender") {
              this.addFilter({[key]: value}, this.genderFilters);
            } else if (key === "status") {
              this.addFilter({[key]: value}, this.statusFilters);
            } else if (key === "start_date") {
              this.addFilter({[key]: value}, this.startDateFilters);
            }
          }
        }
        //this.doSearch(false, `onParamChanged`);
        this.updateFacetFilters();
      } else if (Array.isArray(queryParam)) {
        // TODO: handle multiple params/filters
        console.log(`Params array: ${JSON.stringify(queryParam)}`);
      }
    } else {
      this.doSearch(true, "onParamChanged empty");
    }
  }

  getFacets(): void {
    this.facetQuerySubscription = this.apollo.watchQuery<any>({
      query: this.GET_FACETS,
      variables: this.facetVariables
    })
      .valueChanges
      .subscribe(({ data, loading }) => {
        this.facetsLoading = loading;
        this.facets = data.facets;
      });
  }

  doSearch(append: boolean, msg: string = ""): void {
    //console.log(`doSearch::Current term: ${this.searchVariables.searchInput.term}`);
    this.trialsLoading = true;
    if (this.searchQuerySubscription) this.searchQuerySubscription.unsubscribe();

    this.searchQuerySubscription = this.apollo.watchQuery<any>({
      query: this.FIND_TRIALS,
      variables: this.searchVariables
    })
      .valueChanges
      .subscribe(({ data, loading }) => {
        this.trialsLoading = loading;
        if (data) {
          if (append) {
            if (this.trials) {
              if (Array.isArray(this.trials) && this.trials?.length >= 0) {
                //console.log(`doSearch(append=true)::${msg}: Appending`);
                this.trials = this.trials.concat(data.search);
              } else {
                console.log("trials not an array???");
              }
            } else {
              console.log("trials null - replacing");
              console.log(`doSearch(append=true)::${msg}: Replacing`);
              //this.trials = data.search;
              this.trials = data.search;
            }
          } else {
            console.log(`doSearch(append=false)::${msg}: Replacing`);
            this.trials = data.search;
          }
          this.trialsLoading = false;
        }
      });
  }

  ngOnDestroy() {
    this.trialQuerySubscription?.unsubscribe();
    this.facetQuerySubscription?.unsubscribe();
    this.searchTermSubscription?.unsubscribe();
  }
}
