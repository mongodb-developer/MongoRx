import { ActivatedRoute, ParamMap, Params } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { Component, OnInit, ViewChild } from '@angular/core';
import { faFlask, faChartLine, faNotesMedical } from '@fortawesome/free-solid-svg-icons';
import { noop as _noop } from 'lodash-es';
import { Subscription } from 'rxjs';
import { DocumentNode } from 'graphql';
import { CodeViewDialog } from '../code-view-dialog/code-view-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-drug-detail',
  templateUrl: './drug-detail.component.html',
  styleUrls: [
    '../drug-list/drug-list.component.css',
    '../trial-list/trial-list.component.css',
    './drug-detail.component.css']
})

export class DrugDetailComponent implements OnInit {
  
  // font-awesome icons
  faFlask = faFlask;
  faChartLine = faChartLine;
  faNotesMedical = faNotesMedical;

  // trial data
  drug: any;
  drugs: any;
  trialedWithDrugs: any[];
  trialsUsedIn: any;
  drugId: string | null;
  drugCount: number | null;

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
    return this.drugs || this.drugs?.length < this.limit;
  }

  getData() {
    //console.log(`getting data`);
    this.searchVariables.searchInput.skip = (Number(this.searchVariables.searchInput.skip) + 12).toString();
    // TODO: this.doSearch(true, "from getData");
  }

  //----------------
  // GraphQL queries
  //----------------
  drugQuerySubscription: Subscription | undefined;
  trialedDrugsQuerySubscription: Subscription | undefined;
  countDrugsQuerySubscription: Subscription | undefined;
  trialsUsedInQuerySubscription: Subscription | undefined;
  drugsWithGenericQuerySubscription: Subscription | undefined;

  GET_DRUG = gql`
    query GetDrug($drugQueryInput: Drug_datumQueryInput!) {
      drug_datum(query: $drugQueryInput) {
    	  id
    	  purpose
        openfda {
          brand_name
          generic_name
          manufacturer_name
        }
        description
        effective_time
        active_ingredient
      }
    }
  `;

  GET_TRIALED_WITH_DRUGS = gql`query GetFacetCount($drugTrialedWithFacetInput: DrugTrialedWithFacetInput!) {
  drugTrialedWithFacet(input: $drugTrialedWithFacetInput) {
    drugs {
      name
      count
    }
  }
}`;

  GET_FACETS = gql`
    query GetFacets($drugFacetInput: DrugFacetInput!) {
      drugFacets(input: $drugFacetInput) {
        count {
          total
        }
      }
    }
  `;

  FIND_TRIALS = gql`query FindTrials($searchInput: SearchInput!) {
    search(input: $searchInput) {
      nct_id
      brief_title
      start_date
      completion_date
      condition
      intervention
      intervention_mesh_term
      sponsors {
        agency
      }
      status
      phase
      score
      count {
        total
      }
    }
  }`;

  FIND_DRUGS = gql`
    query FindDrugs($drugSearchInput: DrugSearchInput!) {
      drugSearch(input: $drugSearchInput) {
        id,
        active_ingredient
        effective_time
        indications_and_usage
        openfda {
          brand_name
          generic_name
          manufacturer_name
        }
        score
        count {
          total
        }
      }
    }
  `;

  facetVariables = {
    "drugFacetInput": {
      "term": "",
      "countOnly": true,
      "filters": [] as string[] // e.g., ["manufacturer:Pfizer"]
    }
  };

  drugQueryVariables = {
    "drugQueryInput": {
      "id": "" as string | any // e.g. "b4e15f8c-3af4-71fe-e053-2a95a90a003e"
    }
  };

  drugSearchVariables = {
    "drugSearchInput": {
      "term": "",
      "skip": "0",
      "limit": "12",
      "filters": [] as string[]
    }
  };

  trialedDrugQueryVariables = {
    "drugTrialedWithFacetInput": {
      "term": "" as string | any, // e.g., "Dexamethasone"
      "limit": "5"
    }
  };

  searchVariables = {
    "searchInput": {
      "skip": "0",
      "limit": "12",
      "term": "",
      "filters": [] as string[]
    }
  };

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
      return (lw.charAt(0).toUpperCase() + lw.slice(1));
    }).join(' ');
  }

  // utility function for formatting search results
  trimDescription(str: string): string {
    if (/11\sdescription/i.test(str)) {
      return str.substring(15);
    } else if (/description/i.test(str)) {
      return str.substring(12);
    } else if (/purpose/i.test(str)) {
      return str.substring(8);
    }
    return str;
  }

  openDialog(which: string): void {
    let data = {
      gqlQuery: which == 'trialedWith' ? this.getGqlString(this.GET_TRIALED_WITH_DRUGS) : this.getGqlString(this.FIND_TRIALS),
      gqlQueryTitle: "GraphQL Query",
      gqlQueryLang: "graphql",
      gqlVars: JSON.stringify(which == 'trialedWith' ? this.trialedDrugQueryVariables : this.searchVariables, null, 2),
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

  constructor(
    private apollo: Apollo,
    private activatedRoute: ActivatedRoute,
    private dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params: ParamMap) => {
      this.drugId = params.get('id');
      console.log(`Updated ID to ${this.drugId}`);
      this.drugQueryVariables.drugQueryInput.id = this.drugId;
      this.drugQuerySubscription = this.apollo.watchQuery<any>({
        query: this.GET_DRUG,
        variables: this.drugQueryVariables
      })
        .valueChanges
        .subscribe(({ data, loading }) => {
          this.drug = data.drug_datum;
  
          // get drugs trialed together
          this.trialedDrugQueryVariables.drugTrialedWithFacetInput.term = this.drug.openfda.brand_name;
          this.trialedDrugsQuerySubscription = this.apollo.watchQuery<any>({
            query: this.GET_TRIALED_WITH_DRUGS,
            variables: this.trialedDrugQueryVariables
          })
            .valueChanges
            .subscribe(({ data, loading }) => {
              console.log(`TWG:${data}`);
              this.trialedWithDrugs = data.drugTrialedWithFacet[0].drugs;
            });
  
          // get count of drugs by same manufacturer
          this.facetVariables.drugFacetInput.filters.push(`openfda.manufacturer_name:${this.drug.openfda.manufacturer_name}`);
          this.countDrugsQuerySubscription = this.apollo.watchQuery<any>({
            query: this.GET_FACETS,
            variables: this.facetVariables
          })
            .valueChanges
            .subscribe(({ data, loading }) => {
              this.drugCount = data?.drugFacets[0].count.total - 1; // not counting the current drug
            });
  
          // get trials using this drug
          this.searchVariables.searchInput.filters.push(`intervention_mesh_term:${this.drug.openfda.generic_name}`);
          this.trialsUsedInQuerySubscription = this.apollo.watchQuery<any>({
            query: this.FIND_TRIALS,
            variables: this.searchVariables
          })
            .valueChanges
            .subscribe(({ data, loading }) => {
              this.trialsUsedIn = data?.search;
            });
  
          // get drugs with same generic name
          this.drugSearchVariables.drugSearchInput.filters.push(`openfda.generic_name:"${this.drug.openfda.generic_name}"`);
          this.drugsWithGenericQuerySubscription = this.apollo.watchQuery<any>({
            query: this.FIND_DRUGS,
            variables: this.drugSearchVariables
          })
            .valueChanges
            .subscribe(({ data, loading }) => {
              this.drugs = data?.drugSearch;
            });
  
        });

    });

    }
}
