import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  private isApiLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  isApiLoaded$ = this.isApiLoaded.asObservable();

  constructor(httpClient: HttpClient) {
    console.log('🚀 ~ GoogleMapsService ~ loading Google Maps API...');

    const key = environment.googleMapsApiKey;
    httpClient
      .jsonp(`https://maps.googleapis.com/maps/api/js?key=${key}`, 'callback')
      .subscribe(
        () => {
          console.log('🚀 ~ GoogleMapsService ~ google maps api loaded');
          this.isApiLoaded.next(true);
        },
        (error) => {
          console.log('🚀 ~ GoogleMapsService ~ Google Maps API cannot be loaded', error);
        }
      );
  }
}
