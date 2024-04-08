import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { OrderModule } from 'ngx-order-pipe';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CodeViewDialogComponent, CodeViewDialog } from './code-view-dialog/code-view-dialog.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DrugDetailComponent } from './drug-detail/drug-detail.component';
import { DrugListComponent } from './drug-list/drug-list.component';
import { ScrollContainerComponent } from './scroll-container/scroll-container.component';
import { SearchTermService } from './services/search-term.service';
import { TrialDetailComponent } from './trial-detail/trial-detail.component';
import { TrialListComponent } from './trial-list/trial-list.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'; 
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps'
import { GraphQLModule } from './graphql.module';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';

@NgModule({
  declarations: [
    AppComponent,
    CodeViewDialogComponent,
    CodeViewDialog,
    DashboardComponent,
    DrugDetailComponent,
    DrugListComponent,
    ScrollContainerComponent,
    TrialDetailComponent,
    TrialListComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule.withConfig({
      disableAnimations: false
    }),
    FlexLayoutModule,
    FontAwesomeModule,
    FormsModule,
    ReactiveFormsModule,
    GoogleMapsModule,
    GraphQLModule,
    HttpClientModule,
    HttpClientJsonpModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    OrderModule,
  ],
  providers: [
    SearchTermService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }