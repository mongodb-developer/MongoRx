import { ActivatedRoute, ParamMap, Params } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { Component, OnInit, ViewChild } from '@angular/core';
import { environment } from '../../environments/environment';
import { faChartLine, faFlask, faMedkit, faPlus, faStethoscope, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GoogleMap, MapGeocoder } from '@angular/google-maps';
import { GoogleMapsLoaderService } from '../services/google-maps-loader.service';
import { MatDialog } from '@angular/material/dialog';
import { DocumentNode } from 'graphql';
import { CodeViewDialog } from '../code-view-dialog/code-view-dialog.component';

@Component({
  selector: 'app-trial-detail',
  templateUrl: './trial-detail.component.html',
  styleUrls: ['../trial-list/trial-list.component.css', './trial-detail.component.css']
})

export class TrialDetailComponent implements OnInit {
  @ViewChild(GoogleMap, { static: false }) map: GoogleMap;

  // Google Maps API
  googleMapsApiLoaded: Observable<boolean>;
  zoom: number = 15;
  // default: MongoDB HQ
  center: google.maps.LatLngLiteral = {
    lat: 40.7620853,
    lng: -73.986805
  };
  mapOptions: {
    zoomControl: true,
    mapTypeControl: true,
    scaleControl: true,
    streetViewControl: true,
    rotateControl: true,
    fullscreenControl: false
  };
  markers: any[] = [];
  
  // font-awesome icons
  faChartLine = faChartLine;
  faStethoscope = faStethoscope;
  faPlus = faPlus;
  faFlask = faFlask;
  faMedkit = faMedkit;
  faUserPlus = faUserPlus;

  // trial data
  trial: any;
  nctId: string | null;
  sponsorAddress: string | null;

  //----------------
  // GraphQL queries
  //----------------
  trialQuerySubscription: Subscription | undefined;

  GET_TRIAL = gql`
    query GetTrial($trialQueryInput: TrialQueryInput!) {
      trial(query: $trialQueryInput) {
        nct_id
        brief_title
        start_date
        completion_date
        condition
        detailed_description
        enrollment
        gender
        maximum_age
        minimum_age
        intervention
        intervention_mesh_term
        sponsors {
          agency
        }
        status
        url
        phase
      }
    }
  `;

  trialQueryVariables = {
    trialQueryInput: {
      nct_id: "" as string | any,   // e.g., "NCT00000932"
    }
  };

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

  constructor(
    private apollo: Apollo,
    private activatedRoute: ActivatedRoute,
    private dialog: MatDialog,
    private geocoder: MapGeocoder,
    googleMapsLoader: GoogleMapsLoaderService) {
      this.googleMapsApiLoaded = googleMapsLoader.isApiLoaded$;
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params: ParamMap) => {
      this.nctId = params.get('id');
      this.trialQueryVariables.trialQueryInput.nct_id = this.nctId;
    });

    this.trialQuerySubscription = this.apollo.watchQuery<any>({
      query: this.GET_TRIAL,
      variables: this.trialQueryVariables
    })
      .valueChanges
      .subscribe(({ data, loading }) => {
        this.trial = data.trial;
        console.log(`Sponsor: ${this.trial.sponsors.agency}`);
        this.googleMapsApiLoaded.subscribe(val => {
          this.geocoder.geocode({
            address: this.trial.sponsors.agency
          }).subscribe(({results}) => {
            //console.log(JSON.stringify(results));
            this.sponsorAddress = results[0].formatted_address;
            const location = results[0].geometry.location.toJSON();
            this.center = {lat: location.lat, lng: location.lng};
            console.log(location);
            this.markers.push({
              position: {
                lat: location.lat,
                lng: location.lng,
              },
              title: this.trial.sponsors.agency,
              visible: true
            });
          });
        });
      });
  }

  getGqlString(doc: DocumentNode): string | undefined {
    return doc.loc && doc.loc.source.body;
  }
  
  openDialog(which: string): void {
    let data:any = {};
    data.gqlQuery = `this.geocoder.geocode({
  address: "${this.trial.sponsors.agency}"
}).subscribe(({results}) => {
  this.sponsorAddress = results[0].formatted_address;
  const location = results[0].geometry.location.toJSON();
  this.center = {lat: location.lat, lng: location.lng};
  this.markers.push({
    position: {
      lat: location.lat,
      lng: location.lng,
    },
    title: "${this.trial.sponsors.agency}",
    visible: true
  });
});`;

    data.gqlQueryTitle = "TypeScript Code";
    data.gqlQueryLang = "typescript";
    data.gqlVars = "";
    data.gqlVarsTitle = "";
    data.gqlVarsLang = "";

    const dialogRef = this.dialog.open(CodeViewDialog, {
      width: '50%',
      data: data
    });
  }
}
