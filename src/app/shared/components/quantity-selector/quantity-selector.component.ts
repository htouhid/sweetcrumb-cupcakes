import { Component, input, output } from '@angular/core';
@Component({
  selector: 'app-quantity-selector',
  template: `<div class="quantity" role="group" [attr.aria-label]="label()">
    <button
      type="button"
      [disabled]="value() <= min()"
      (click)="valueChange.emit(value() - 1)"
      [attr.aria-label]="'Decrease ' + label()"
    >
      −</button
    ><output aria-live="polite">{{ value() }}</output
    ><button
      type="button"
      [disabled]="value() >= max()"
      (click)="valueChange.emit(value() + 1)"
      [attr.aria-label]="'Increase ' + label()"
    >
      +
    </button>
  </div>`,
  styles: [
    `
      .quantity {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d7c6be;
        border-radius: 8px;
        overflow: hidden;
      }
      button {
        width: 42px;
        height: 44px;
        border: 0;
        background: transparent;
        font-size: 20px;
      }
      output {
        min-width: 30px;
        text-align: center;
      }
    `,
  ],
})
export class QuantitySelectorComponent {
  readonly value = input(1);
  readonly min = input(1);
  readonly max = input(99);
  readonly label = input('quantity');
  readonly valueChange = output<number>();
}
