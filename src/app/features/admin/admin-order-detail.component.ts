import { nextOrderAction, OrderWorkflowAction } from '../../core/models/admin-order-workflow';
import { CurrencyPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import {
  OrderItem,
  ORDER_STATUS_LABELS,
  orderDateLabel,
  pickupTimeLabel,
} from '../../core/models/order';
import { CatalogStatusComponent } from '../../shared/components/catalog-status/catalog-status.component';
@Component({
  selector: 'app-admin-order-detail',
  imports: [CurrencyPipe, RouterLink, CatalogStatusComponent],
  templateUrl: './admin-order-detail.component.html',
  styleUrl: './admin-order-detail.component.scss',
})
export class AdminOrderDetailComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly admin = inject(AdminService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly order = computed(() =>
    this.admin.orders().find((order) => order.id === this.params()?.get('id')),
  );
  readonly items = signal<readonly OrderItem[]>([]);
  readonly loadingItems = signal(false);
  readonly itemError = signal<string | null>(null);
  readonly labels = ORDER_STATUS_LABELS;
  readonly dateLabel = orderDateLabel;
  readonly timeLabel = pickupTimeLabel;
  readonly nextAction = computed(() =>
    this.order() ? nextOrderAction(this.order()!.status) : null,
  );
  readonly updating = signal(false);
  readonly statusMessage = signal<string | null>(null);
  readonly statusError = signal<string | null>(null);
  readonly selectedAction = signal<{
    orderId: string;
    orderNumber: string;
    action: OrderWorkflowAction;
  } | null>(null);
  private readonly confirmation = viewChild.required<ElementRef<HTMLDialogElement>>('confirmation');
  private readonly backLink = viewChild.required<ElementRef<HTMLAnchorElement>>('backLink');
  private trigger: HTMLButtonElement | null = null;
  private revision = 0;
  constructor() {
    effect(() => {
      const order = this.order();
      if (order)
        untracked(() => {
          void this.loadItems(order.id);
        });
      else {
        this.revision++;
        this.items.set([]);
      }
    });
  }
  requestStatusChange(event: Event) {
    const order = this.order();
    const action = this.nextAction();
    if (!order || !action || this.updating() || this.admin.updatingOrderId()) return;
    this.statusMessage.set(null);
    this.statusError.set(null);
    this.trigger = event.currentTarget as HTMLButtonElement;
    this.selectedAction.set({ orderId: order.id, orderNumber: order.order_number, action });
    this.confirmation().nativeElement.showModal();
  }
  dismissConfirmation() {
    if (this.updating()) return;
    this.closeConfirmation();
  }
  onDialogCancel(event: Event) {
    event.preventDefault();
    this.dismissConfirmation();
  }
  private closeConfirmation() {
    if (this.destroyRef.destroyed) return;
    this.confirmation().nativeElement.close();
    this.selectedAction.set(null);
    if (this.trigger?.isConnected && !this.trigger.disabled) this.trigger.focus();
    else this.backLink().nativeElement.focus();
  }
  async confirmStatusChange() {
    const selection = this.selectedAction();
    if (!selection || this.updating() || this.admin.updatingOrderId()) return;
    this.updating.set(true);
    try {
      const result = await this.admin.updateOrderStatus(selection.orderId, selection.action.target);
      this.statusMessage.set(`Order ${result.order_number} is now ${this.labels[result.status]}.`);
    } catch {
      this.statusError.set(
        'We couldn’t confirm this status change. The order may have changed elsewhere, or your session or permissions may have expired. Review the refreshed status before trying again.',
      );
    } finally {
      this.updating.set(false);
      this.closeConfirmation();
    }
  }
  retryItems() {
    const order = this.order();
    if (order) void this.loadItems(order.id);
  }
  private async loadItems(id: string) {
    const revision = ++this.revision;
    this.loadingItems.set(true);
    this.itemError.set(null);
    this.items.set([]);
    try {
      const items = await this.admin.getOrderItems(id);
      if (revision === this.revision) this.items.set(items);
    } catch {
      if (revision === this.revision)
        this.itemError.set('We couldn’t load the items for this order. Please try again.');
    } finally {
      if (revision === this.revision) this.loadingItems.set(false);
    }
  }
}
