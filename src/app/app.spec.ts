import { ProductService } from './core/services/product.service';
import { signal } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: ProductService,
          useValue: { products: signal([]), loaded: signal(false), byId: () => undefined },
        },
        {
          provide: AuthService,
          useValue: { authLoading: signal(false), isAuthenticated: signal(false) },
        },
      ],
    }).compileComponents();
  });

  it('renders the storefront shell and accessible navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('header')?.textContent).toContain('SweetCrumb');
    expect(element.querySelector('nav[aria-label="Main navigation"]')).toBeTruthy();
    expect(element.querySelector('main#main-content')).toBeTruthy();
    expect(element.querySelector('footer')).toBeTruthy();
  });
});
