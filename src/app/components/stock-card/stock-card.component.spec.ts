import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockCardComponent } from './stock-card.component';
import { StockState } from '../../models/stock.model';

const mockStock: StockState = {
  quote: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 175.50,
    dailyHigh: 177.20,
    dailyLow: 173.80,
    weekHigh52: 199.62,
    weekLow52: 143.90,
  },
  active: true,
  trend: 'neutral',
  openPrice: 170.00,
  lastTradeTime: null,
};

describe('StockCardComponent', () => {
  let component: StockCardComponent;
  let fixture: ComponentFixture<StockCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StockCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('stock', mockStock);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display stock symbol', () => {
    const el = fixture.nativeElement.querySelector('.card__symbol');
    expect(el?.textContent?.trim()).toBe('AAPL');
  });

  it('should display stock name', () => {
    const el = fixture.nativeElement.querySelector('.card__name');
    expect(el?.textContent?.trim()).toBe('Apple Inc.');
  });

  it('should render both ON and OFF labels in the toggle', () => {
    const labels = fixture.nativeElement.querySelectorAll('.card__toggle-label');
    const texts = Array.from(labels).map((el: any) => el.textContent.trim());
    expect(texts).toContain('ON');
    expect(texts).toContain('OFF');
  });

  it('should apply card__toggle--on class when active', () => {
    const el = fixture.nativeElement.querySelector('.card__toggle');
    expect(el?.classList.contains('card__toggle--on')).toBe(true);
  });

  it('should not apply card__toggle--on class when inactive', () => {
    fixture.componentRef.setInput('stock', { ...mockStock, active: false });
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.card__toggle');
    expect(el?.classList.contains('card__toggle--on')).toBe(false);
  });

  it('should emit toggled with symbol on click', () => {
    const emitted: string[] = [];
    const sub = component.toggled.subscribe((v: string) => emitted.push(v));
    fixture.nativeElement.click();
    expect(emitted).toEqual(['AAPL']);
    sub.unsubscribe();
  });

  it('should have is-up class when trend is up and active', () => {
    fixture.componentRef.setInput('stock', { ...mockStock, trend: 'up', active: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('is-up')).toBe(true);
  });

  it('should have is-down class when trend is down and active', () => {
    fixture.componentRef.setInput('stock', { ...mockStock, trend: 'down', active: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('is-down')).toBe(true);
  });

  it('should have is-inactive class when not active', () => {
    fixture.componentRef.setInput('stock', { ...mockStock, active: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('is-inactive')).toBe(true);
  });

  it('should not have is-up class when inactive even if trend is up', () => {
    fixture.componentRef.setInput('stock', { ...mockStock, active: false, trend: 'up' });
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('is-up')).toBe(false);
  });

  it('should display current price', () => {
    const el = fixture.nativeElement.querySelector('.card__price');
    expect(el?.textContent?.trim()).toContain('175.50');
  });

  it('should display price change with + sign when positive', () => {
    const el = fixture.nativeElement.querySelector('.card__change');
    expect(el?.textContent?.trim()).toContain('+5.50');
  });

  it('should show last trade section when lastTradeTime is set', () => {
    const date = new Date('2026-04-02T14:30:00');
    fixture.componentRef.setInput('stock', { ...mockStock, lastTradeTime: date });
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.card__trade');
    expect(el).toBeTruthy();
  });

  it('should hide last trade section when lastTradeTime is null', () => {
    const el = fixture.nativeElement.querySelector('.card__trade');
    expect(el).toBeNull();
  });
});
