import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `<section class="container section empty-state">
    <p class="eyebrow">404 · A MISSING CRUMB</p>
    <h1>This page wandered out of the bakery.</h1>
    <a class="button button-primary" routerLink="/">Back to SweetCrumb</a>
  </section>`,
})
export class NotFoundComponent {}
