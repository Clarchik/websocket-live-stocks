import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AbstractStockService } from './services/abstract-stock.service';
import { MockStockService } from './services/mock-stock.service';
import { FinnhubStockService } from './services/finnhub-stock.service';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    providers: [{ provide: AbstractStockService, useClass: MockStockService }],
  },
  {
    path: 'finnhub',
    component: DashboardComponent,
    providers: [{ provide: AbstractStockService, useClass: FinnhubStockService }],
  },
  { path: '**', redirectTo: '' },
];
