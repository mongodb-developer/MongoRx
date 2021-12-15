import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// my routing components
import { DrugDetailComponent } from './drug-detail/drug-detail.component';
import { DrugListComponent } from './drug-list/drug-list.component';
import { TrialDetailComponent } from './trial-detail/trial-detail.component';
import { TrialListComponent } from './trial-list/trial-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'trials', component: TrialListComponent },
  { path: 'trials/:id', component: TrialDetailComponent },
  { path: 'drugs', component: DrugListComponent },
  { path: 'drugs/:id', component: DrugDetailComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
