import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { installOrderEmailTest } from './app/core/dev/order-email-test';
import { OrderService } from './app/core/services/order.service';

bootstrapApplication(App, appConfig)
  .then((app) => {
    const cleanup = installOrderEmailTest(window, (orderId) =>
      app.injector.get(OrderService).sendOrderEmailsForDevelopment(orderId),
    );
    app.onDestroy(cleanup);
  })
  .catch(() => console.error('SweetCrumb could not start.'));
