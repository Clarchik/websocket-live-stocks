import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { StockState } from '../../models/stock.model';

@Component({
  selector: 'app-stock-card',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './stock-card.component.html',
  styleUrl: './stock-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'onToggle()',
    '(keydown.enter)': 'onToggle()',
    '(keydown.space)': '$event.preventDefault(); onToggle()',
    '[attr.role]': '"button"',
    '[attr.tabindex]': '"0"',
    '[attr.aria-pressed]': 'stock().active',
    '[class.is-up]': 'stock().active && stock().trend === "up"',
    '[class.is-down]': 'stock().active && stock().trend === "down"',
    '[class.is-inactive]': '!stock().active',
  },
})
export class StockCardComponent {
  readonly stock = input.required<StockState>();
  readonly toggled = output<string>();

  protected readonly priceChange = computed(() => {
    const { currentPrice } = this.stock().quote;
    const open = this.stock().openPrice;
    return parseFloat((currentPrice - open).toFixed(2));
  });

  protected readonly priceChangePercent = computed(() => {
    const open = this.stock().openPrice;
    return parseFloat(((this.priceChange() / open) * 100).toFixed(2));
  });

  protected onToggle(): void {
    this.toggled.emit(this.stock().quote.symbol);
  }
}
