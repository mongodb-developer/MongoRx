import { Apollo, gql } from 'apollo-angular';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { faFlask, faPlus } from '@fortawesome/free-solid-svg-icons';
import { map } from 'rxjs/operators';
import { noop as _noop } from 'lodash-es';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { SearchTermService } from "../services/search-term.service";
import { Subscription, Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DocumentNode } from 'graphql';
import { CodeViewDialog } from '../code-view-dialog/code-view-dialog.component';

@Component({
  selector: 'app-drug-list',
  templateUrl: './drug-list.component.html',
  styleUrls: ['./drug-list.component.css']
})

export class DrugListComponent implements OnInit, OnDestroy {
  drugsLoading: boolean = false;
  facetsLoading: boolean = false;
  drugs: any;
  facets: any;
  filter$: Observable<string | string[] | null>;
  private drugQuerySubscription: Subscription | undefined;
  private facetQuerySubscription: Subscription | undefined;
  private drugSearchQuerySubscription: Subscription | undefined;
  private searchTermSubscription: Subscription | undefined;

  //----------------
  // infinite scroll
  //----------------
  limit: number = 1000; // how many before performance degrades?
  handleScroll = (scrolled: boolean) => {
    scrolled ? this.getData() : _noop();
  }

  hasMore = () => {
    return this.drugs || this.drugs?.length < this.limit;
  }

  getData() {
    //console.log(`getting data`);
    this.searchVariables.drugSearchInput.skip = (Number(this.searchVariables.drugSearchInput.skip) + 12).toString();
    this.doSearch(true, "from getData");
  }

  //----------------
  // GraphQL queries
  //----------------
  FIND_DRUGS = gql`query FindDrugs($drugSearchInput: DrugSearchInput!) {
  drugSearch(input: $drugSearchInput) {
    id,
    active_ingredient
    effective_time
    indications_and_usage
    openfda { brand_name generic_name manufacturer_name }
    highlights {
      path
      score
      texts { type value }
    }
    score
    count { total }
  }
}`;

  GET_FACETS = gql`query GetFacets($drugFacetInput: DrugFacetInput!) {
  drugFacets(input: $drugFacetInput) {
    manufacturers {
      count
      name
    }
    routes {
      count
      name
    }
  }
}`;

  facetVariables = {
    "drugFacetInput": {
      "term": "",   // e.g., "cancer"
      "countOnly": false,
      "filters": [] as string[] // e.g., ["manufacturer=Pfizer","active_ingredient=..."]
    }
  };

  searchVariables = {
    "drugSearchInput": {
      "skip": "0",
      "limit": "12",
      "term": "",   // e.g., "carboplatin"
      "filters": [] as string[]
    }
  };

  // font-awesome icons
  faPlus = faPlus;
  faFlask = faFlask;

  selectable = true;
  removable = true;
  toggle = true;
  objectKeys = Object.keys;
  objectValues = Object.values;

  //------------
  // facet filters
  //------------
  manufacturerFilters: any[] = [];
  routeFilters: any[]      = [];
  facetFilters: string[]     = [];

  updateFacetFilters() : void {
    let allFilters = this.manufacturerFilters
      //.concat(this.interventionFilters)
      ; // TODO: add more?
    console.log(`All filters: ${JSON.stringify(allFilters)}`);
    let queryStringFilters = new Set<string>();
    allFilters.map((filter) => {
      Object.keys(filter).map((key) => {
        queryStringFilters.add(`${key}:${filter[key]}`);
      });
    });
    this.searchVariables.drugSearchInput.filters = Array.from(queryStringFilters);
    this.searchVariables.drugSearchInput.skip = "0";
    this.doSearch(false, "from updateFacetFilters");

    this.facetVariables.drugFacetInput.filters = this.searchVariables.drugSearchInput.filters;
    this.getFacets();
  }

  onManufacturerFacetClicked(facetName: string): void {
    let added = this.addFilter({"openfda.manufacturer_name": facetName}, this.manufacturerFilters);
    if (added === -1) this.updateFacetFilters();
  }

  onRouteFacetClicked(facetName: string): void {
    let added = this.addFilter({"openfda.route": facetName}, this.routeFilters);
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
  removeSearchTerm(): void {

    this.searchVariables.drugSearchInput.term = "";
    this.facetVariables.drugFacetInput.term = "";
    const queryParams: Params = {
      //q: ""
    };

    this.router.navigate(
      [], 
      {
        relativeTo: this.activatedRoute,
        queryParams: queryParams,
        queryParamsHandling: 'merge'
      });

    this.searchTermService.changeTerm("");
  }

  removeSearchTermAndFilters(): void {
    this.searchVariables.drugSearchInput.term = "";
    this.searchVariables.drugSearchInput.filters = [];
    this.facetVariables.drugFacetInput.term = "";
    this.facetVariables.drugFacetInput.filters = [];
    this.manufacturerFilters = [];
    this.routeFilters = [];

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
    this.manufacturerFilters = [];

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

  getType(obj: any) {
    return typeof obj;
  }

  // utility function for formatting search results
  titleCase(str: string | any): string {
    if (typeof str !== "string") {
      str = str.toString();
    }
    const lowers = ["a", "and", "at", "by", "in", "for", "or", "of", "over", "the", "to"];
    return str.split(' ').map(function (word: string, index: number) {
      if (word === "A" && index === 0) {
        return word;  // special case, title beginning with "A ..."
      }
      let lw = word.toLowerCase();
      if (lowers.indexOf(lw) >= 0) return lw;
      if (word.indexOf('-') >= 0) return word;
      return (lw.charAt(0).toUpperCase() + lw.slice(1));
    }).join(' ');
  }

  // utility function for formatting search results
  trimActiveIngredient(str: string): string {
    if (/active\singredient\sactive\singredient\spurpose/i.test(str)) {
      return str.substring(44);
    } else if (/active\singredient\s\[s\]/i.test(str)) {
      return str.substring(22);
    } else if (/active\singredient\(s\)/i.test(str)) {
      return str.substring(21);
    } else if (/active\singredient\[s\]/i.test(str)) {
      return str.substring(21);
    } else if (/active\singredients\:/i.test(str)) {
      return str.substring(20);
    } else if (/active\singredients/i.test(str)) {
      return str.substring(19);
    } else if (/active\singredient/i.test(str)) {
      return str.substring(18);
    } else if (/active\singedient/i.test(str)) {
      return str.substring(17);
    }
    return str;
  }
  
  constructor(
    private apollo: Apollo,
    private _cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private searchTermService: SearchTermService,
    private dialog: MatDialog) {
  }

  openDialog(which: string): void {
    let data = {
      gqlQuery: which == 'facets' ? this.getGqlString(this.GET_FACETS) : this.getGqlString(this.FIND_DRUGS),
      gqlQueryTitle: "GraphQL Query",
      gqlQueryLang: "graphql",
      gqlVars: JSON.stringify(which == 'facets' ? this.facetVariables : this.searchVariables, null, 2),
      gqlVarsTitle: "Query Variables",
      gqlVarsLang: "json"
    }

    const dialogRef = this.dialog.open(CodeViewDialog, {
      width: '50%',
      data: data
    });
  }

  getGqlString(doc: DocumentNode): string | undefined {
    return doc.loc && doc.loc.source.body;
  }

  ngOnInit() {
    this.searchTermSubscription = this.searchTermService.currentTerm.subscribe(term => {
      this.searchVariables.drugSearchInput.term = term;
      this.facetVariables.drugFacetInput.term = term;
    });

    this.filter$ = this.activatedRoute.queryParamMap.pipe(
      // TODO: q param should only use params.get. Facets can use getAll
      map((params: ParamMap) => {
        let keys = params.keys;
        if (keys.length === 0) {
          // no params -- clear filters
          this.drugs = []; // force facet re-count
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
          if (keys.indexOf("openfda.manufacturer_name") >= 0) {
            qParam += `|openfda.manufacturer_name=${params.get('openfda.manufacturer_name')}`
          }
          if (keys.indexOf("openfda.route") >= 0) {
            qParam += `|openfda.route=${params.get('openfda.route')}`
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
            console.log(`key: ${key}`);
            if (key === "q" && value.trim().length > 0 && value.trim() !== "null") {
              if (this.searchVariables.drugSearchInput.term != value) {
                this.searchVariables.drugSearchInput.term = value || '';
                this.facetVariables.drugFacetInput.term = value || '';
              } else {
                console.log("ngOnInit param unchanged")
              }
            } else if (key === "openfda.manufacturer_name") {
              this.addFilter({[key]: value}, this.manufacturerFilters);
            } else if (key === "openfda.route") {
              this.addFilter({[key]: value}, this.routeFilters);
            }
          }
        }
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
        this.facets = data.drugFacets;
      });
  }

  doSearch(append: boolean, msg: string = ""): void {
    //console.log(`doSearch::Current term: ${this.searchVariables.searchInput.term}`);
    this.drugsLoading = true;
    if (this.drugSearchQuerySubscription) this.drugSearchQuerySubscription.unsubscribe();

    this.drugSearchQuerySubscription = this.apollo.watchQuery<any>({
      query: this.FIND_DRUGS,
      variables: this.searchVariables
    })
      .valueChanges
      .subscribe(({ data, loading }) => {
        this.drugsLoading = loading;
        if (data) {
          if (append) {
            if (this.drugs) {
              if (Array.isArray(this.drugs) && this.drugs?.length >= 0) {
                //console.log(`doSearch(append=true)::${msg}: Appending`);
                this.drugs = this.drugs.concat(data.drugSearch);
              } else {
                console.log("drugs not an array???");
              }
            } else {
              console.log("drugs null - replacing");
              console.log(`doSearch(append=true)::${msg}: Replacing`);
              this.drugs = data.drugSearch;
            }
          } else {
            console.log(`doSearch(append=false)::${msg}: Replacing`);
            this.drugs = data.drugSearch;
          }
          this.drugsLoading = false;
        }
      });
  }

  ngOnDestroy() {
    this.drugQuerySubscription?.unsubscribe();
    this.facetQuerySubscription?.unsubscribe();
    this.searchTermSubscription?.unsubscribe();
  }
}
