import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MockStockService } from './services/mock-stock.service';
import { FinnhubStockService } from './services/finnhub-stock.service';
import { STOCK_SERVICE } from './interfaces/stock-service.token';
import { StockStore } from './stores/stock-store';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    providers: [{ provide: STOCK_SERVICE, useClass: MockStockService }, StockStore],
  },
  {
    path: 'finnhub',
    component: DashboardComponent,
    providers: [{ provide: STOCK_SERVICE, useClass: FinnhubStockService }, StockStore],
  },
  { path: '**', redirectTo: '' },
];
