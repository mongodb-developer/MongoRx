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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';

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
    MatTabsModule,
    OrderModule,
  ],
  providers: [
    SearchTermService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }