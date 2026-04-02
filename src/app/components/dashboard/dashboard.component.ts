import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { StockCardComponent } from '../stock-card/stock-card.component';
import { AbstractStockService } from '../../services/abstract-stock.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [StockCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly stockService = inject(AbstractStockService);
  readonly stocks = this.stockService.stocks;
  readonly connectionStatus = this.stockService.connectionStatus;

  onToggle(symbol: string): void {
    this.stockService.toggleStock(symbol);
  }
}
