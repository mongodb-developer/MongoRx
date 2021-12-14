import { Apollo, gql } from 'apollo-angular';
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { faFlask, faMedkit, faPlus, faStethoscope, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { fromEvent, Subscription } from 'rxjs';

import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom";
import { MatDialog } from '@angular/material/dialog';
import { DocumentNode } from 'graphql';
import { CodeViewDialog } from '../code-view-dialog/code-view-dialog.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})

export class DashboardComponent implements OnInit, OnDestroy {
  constructor(
    private _cdr: ChangeDetectorRef,
    private apollo: Apollo,
    private dialog: MatDialog) {}
  // facet count
  facetCount = 0;
  facetCountVariables = {
    facetInput: {
      term: "",   // e.g., "cancer"
      countOnly: true,
      filters: [""] // e.g., ["condition=Neoplasms","intervention=procedure"]
    }
  };
  facetFilters = [""];
  chartFilters: any = {};
  trialLinkFilters: any = {};
  private facetQuerySubscription: Subscription | undefined;

  /**
   * Updates the total number of trial documents matching the current
   * set of filter conditions
   */
  updateFacetFilters() : void {
    let allFilters = this.conditionFilters
      .concat(this.interventionFilters)
      .concat(this.statusFilters)
      .concat(this.conditionFilters)
      .concat(this.sponsorFilters)
      .concat(this.productFilters); // TODO: add more
    console.log(`All filters: ${JSON.stringify(allFilters)}`);
    this.chartFilters = {};
    this.trialLinkFilters = {};
    allFilters.map((filter)=>{
      Object.assign(this.chartFilters, filter);
      let tokens = filter["sponsors.agency"]?.split(" ");
      if (tokens && tokens.length > 1) {
        filter["sponsors.agency"] = "\"" + filter["sponsors.agency"] + "\"";
      }
      Object.assign(this.trialLinkFilters, filter);
    });
    this.facetFilters = Object.keys(this.chartFilters).map((key) => `${key}:${this.chartFilters[key]}`);
    console.log(`Facet count filters: ${JSON.stringify(this.facetFilters)}`);
    this.setFacetCount("", this.facetFilters);
  }

  FACET_COUNT_QUERY = gql`query GetFacetCount($facetInput: FacetInput!) {
  facets(input: $facetInput) {
    count {
      total
    }
  }
}`;

  setFacetCount(term: string, filters: string[]) : void {
    this.facetCountVariables.facetInput.term = term;
    this.facetCountVariables.facetInput.filters = filters;
    this.facetQuerySubscription = this.apollo.watchQuery<any>({
      query: this.FACET_COUNT_QUERY,
      variables: this.facetCountVariables
    })
      .valueChanges
      .subscribe(({ data, loading }) => {
        this.facetCount = data.facets[0].count.total;
      });
  }

  getGqlString(doc: DocumentNode): string | undefined {
    return doc.loc && doc.loc.source.body;
  }

  openDialog(which: string): void {
    let data: any = {};
    switch (which) {
      case "condition":
        data.gqlQuery = `public conditionChart: any = this.sdk.createChart({
  chartId: "49658e73-a963-4be0-a613-721d948793f6"
});`;
        break;

        case "sponsor":
          data.gqlQuery = `public sponsorChart: any = this.sdk.createChart({
  chartId: "7ae29da0-2467-4180-a461-1faa0fa26527"
});`;
          break;

        case "intervention":
          data.gqlQuery = `public interventionChart: any = this.sdk.createChart({
  chartId: "c5ede44c-ec97-44fe-86c3-463c30e9ec39"
});`;
          break;

        case "status":
          data.gqlQuery = `public statusChart: any = this.sdk.createChart({
  chartId: "16f4d4ff-bbac-4308-b48f-14d40fbdc490"
});`;
          break;

        case "drug":
          data.gqlQuery = `public productChart: any = this.sdk.createChart({
  chartId: "01f24b86-e9cb-41d6-bff7-dfe0fed0e1f7"
});`;
          break;

      case "count":
        data.gqlQuery = this.getGqlString(this.FACET_COUNT_QUERY);
        data.gqlQueryTitle = "GraphQL Query";
        data.gqlQueryLang = "graphql";
        data.gqlVars = JSON.stringify(this.facetCountVariables, null, 2);
        data.gqlVarsLang = "json";
        data.gqlVarsTitle = "Query Variables";
        break;
    }
    
    console.log(`DATA:\n${JSON.stringify(data, null, 2)}`);
    data.gqlQueryLang = data.gqlQueryLang || "javascript";
    data.gqlQueryTitle = data.gqlQueryTitle || "Atlas Charts Embedding SDK";
    data.gqlVars = data.gqlVars || "";
    data.gqlVarsLang = data.gqlVarsLang || "";
    data.gqlVarsTitle = data.gqlVarsTitle || "";


    const dialogRef = this.dialog.open(CodeViewDialog, {
      width: '50%',
      data: data
    });
  }
  
  // font-awesome icons
  faStethoscope = faStethoscope;
  faPlus = faPlus;
  faFlask = faFlask;
  faMedkit = faMedkit;
  faUserPlus = faUserPlus;

  // Atlas Charts
  sdk: ChartsEmbedSDK = new ChartsEmbedSDK({
    baseUrl: "https://charts.mongodb.com/charts-global_shared-jebkk"
  });

  public conditionChart: any = this.sdk.createChart({
    chartId: "61b813c0-fe30-43ef-8143-e7cc8abcc240"
  });
  interventionChart: any = this.sdk.createChart({
    chartId: "61b813c0-fe30-4462-86e6-e7cc8abcc238"
  });
  sponsorChart: any = this.sdk.createChart({
    chartId: "61b813c0-fe30-4bca-87ce-e7cc8abcc23a"
  });
  statusChart: any = this.sdk.createChart({
    chartId: "61b813c0-fe30-4acc-8b96-e7cc8abcc23e"
  });
  productChart: any = this.sdk.createChart({
    chartId: "61b813c0-fe30-4474-8215-e7cc8abcc23c"
  });

  options = { includes: [{ roles: ["mark"] }] };

  conditionChartClickHandler(payload: any): void {
    this.conditionChart.setHighlight(payload.event.selectionFilter);
    let index = this.conditionFilters.findIndex((filter) => {
      return this.shallowEqual(filter, payload.event.selectionFilter);
    });
    if (index === -1) {
      this.conditionFilters.push(payload.event.selectionFilter);
      this.onFiltersChanged(this.conditionFilters);
    }
  };

  interventionChartClickHandler(payload: any): void {
    this.interventionChart.setHighlight(payload.event.selectionFilter);
    let index = this.interventionFilters.findIndex((filter) => {
      return this.shallowEqual(filter, payload.event.selectionFilter);
    });
    if (index === -1) {
      this.interventionFilters.push(payload.event.selectionFilter);
      this.onFiltersChanged(this.interventionFilters);
    }
  };

  statusChartClickHandler(payload: any): void {
    this.statusChart.setHighlight(payload.event.selectionFilter);
    let index = this.statusFilters.findIndex((filter) => {
      return this.shallowEqual(filter, payload.event.selectionFilter);
    });
    if (index === -1) {
      this.statusFilters.push(payload.event.selectionFilter);
      this.onFiltersChanged(this.statusFilters);
    }
  };

  productChartClickHandler(payload: any): void {
    this.productChart.setHighlight(payload.event.selectionFilter);
    let index = this.productFilters.findIndex((filter) => {
      return this.shallowEqual(filter, payload.event.selectionFilter);
    });
    if (index === -1) {
      this.productFilters.push(payload.event.selectionFilter);
      this.onFiltersChanged(this.productFilters);
    }
  };

  sponsorChartClickHandler(payload: any): void {
    this.sponsorChart.setHighlight(payload.event.selectionFilter);
    let index = this.sponsorFilters.findIndex((filter) => {
      return this.shallowEqual(filter, payload.event.selectionFilter);
    });
    if (index === -1) {
      this.sponsorFilters.push(payload.event.selectionFilter);
      this.onFiltersChanged(this.sponsorFilters);
    }
  };

  conditionFilters: any[] = [];
  interventionFilters: any[] = [];
  statusFilters: any[] = [];
  sponsorFilters: any[] = [];
  productFilters: any[] = [];
  
  selectable = true;
  removable = true;
  toggle = true;
  objectKeys = Object.keys;
  objectValues = Object.values;

  shallowEqual(object1: object, object2: object): boolean {
    return JSON.stringify(object1) === JSON.stringify(object2);
  }

  removeFilter(filterToRemove: any, filtersToRemoveFrom: any[]): void {
    let index = filtersToRemoveFrom.findIndex((filter) => {
      return this.shallowEqual(filter, filterToRemove);
    });
    filtersToRemoveFrom.splice(index, 1);
    this.onFiltersChanged(filtersToRemoveFrom);

    let filterField = this.objectKeys(filterToRemove)[0];
    switch(filterField) {
      case "condition":
        this.conditionChart.setHighlight({});
        break;
      case "sponsors.agency":
        this.sponsorChart.setHighlight({});
        break;
      case "intervention":
        this.interventionChart.setHighlight({});
        break;
      case "status":
        this.statusChart.setHighlight({});
        break;
      case "intervention_mesh_term":
        this.productChart.setHighlight({});
        break;
    }
  }

  onFiltersChanged(filters: any[]): void {
    // wrapped in async to parallelize chart filtering
    (async () => {
      this._cdr.detectChanges();
      this.updateFacetFilters();

      let conditionChartFilter = this.conditionChart.setFilter(this.chartFilters);
      let interventionChartFilter = this.interventionChart.setFilter(this.chartFilters);
      let sponsorChartFilter = this.sponsorChart.setFilter(this.chartFilters);
      let statusChartFilter = this.statusChart.setFilter(this.chartFilters);
      let productChartFilter = this.productChart.setFilter(this.chartFilters);

      let filteredCharts = await Promise.all([
        conditionChartFilter,
        interventionChartFilter,
        sponsorChartFilter,
        statusChartFilter,
        productChartFilter
      ]);
    })();
  }

  ngOnInit(): void {
    // wrapped in async to parallelize chart rendering
    (async () => {
      let conditionChartRender = this.conditionChart.render(document.getElementById("condition-chart"));
      let interventionChartRender =  this.interventionChart.render(document.getElementById("intervention-chart"));
      let sponsorChartRender =  this.sponsorChart.render(document.getElementById("sponsor-chart"));
      let statusChartRender =  this.statusChart.render(document.getElementById("status-chart"));
      let productChartRender =  this.productChart.render(document.getElementById("product-chart"));

      let renderedCharts = await Promise.all([
        conditionChartRender,
        interventionChartRender,
        sponsorChartRender,
        statusChartRender,
        productChartRender
      ])

      fromEvent(this.conditionChart, 'click').subscribe(event => this.conditionChartClickHandler({event}));
      fromEvent(this.interventionChart, 'click').subscribe(event => this.interventionChartClickHandler({event}));
      fromEvent(this.statusChart, 'click').subscribe(event => this.statusChartClickHandler({event}));
      fromEvent(this.sponsorChart, 'click').subscribe(event => this.sponsorChartClickHandler({event}));
      fromEvent(this.productChart, 'click').subscribe(event => this.productChartClickHandler({event}));
      this.setFacetCount("", [""]);
    })();
  }

  ngOnDestroy() {
    this.facetQuerySubscription?.unsubscribe();
  }

  onClearAll(): void {
    // clear all filters
    this.conditionFilters = [];
    this.interventionFilters = [];
    this.statusFilters = [];
    this.sponsorFilters = [];
    this.productFilters = [];

    // update charts
    this.onFiltersChanged(this.conditionFilters);
    this.onFiltersChanged(this.productFilters);
    this.onFiltersChanged(this.sponsorFilters);
    this.onFiltersChanged(this.statusFilters);
    this.onFiltersChanged(this.interventionFilters);

    // remove highlights
    this.conditionChart.setHighlight({});
    this.interventionChart.setHighlight({});
    this.sponsorChart.setHighlight({});
    this.productChart.setHighlight({});
    this.statusChart.setHighlight({});

    // update total count
    this.updateFacetFilters();
  }

}
