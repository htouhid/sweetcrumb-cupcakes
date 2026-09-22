import { signal } from '@angular/core';
import { TEST_PRODUCTS } from '../testing/products.fixture';
import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { ProductService } from './product.service';

describe('CartService', () => {
  const products = signal(TEST_PRODUCTS);
  const loaded = signal(true);
  const catalog = {
    products,
    loaded,
    byId: (id: string) => products().find((product) => product.id === id),
  };
  function configure() {
    TestBed.configureTestingModule({ providers: [{ provide: ProductService, useValue: catalog }] });
  }

  beforeEach(() => {
    localStorage.clear();
    products.set(TEST_PRODUCTS);
    loaded.set(true);
    configure();
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('combines additions, caps inventory, and computes totals', () => {
    const cart = TestBed.inject(CartService);
    const product = TestBed.inject(ProductService).products()[0];
    cart.addItem(product, 2);
    cart.addItem(product, 3);
    expect(cart.lines().length).toBe(1);
    expect(cart.totalQuantity()).toBe(5);
    expect(cart.subtotal()).toBe(22.5);
    cart.addItem(product, 100);
    expect(cart.totalQuantity()).toBe(product.inventoryQuantity);
    expect(cart.remaining(product)).toBe(0);
  });

  it('changes quantities and removes items without invalid totals', () => {
    const cart = TestBed.inject(CartService);
    const products = TestBed.inject(ProductService).products();
    cart.addItem(products[0]);
    cart.addItem(products[1], 2);
    cart.setQuantity(products[0].id, 3);
    expect(cart.lines().map((line) => line.product.id)).toEqual([products[0].id, products[1].id]);
    expect(cart.subtotal()).toBe(23);
    cart.setQuantity(products[0].id, Number.NaN);
    expect(cart.totalQuantity()).toBe(5);
    cart.removeItem(products[1].id);
    expect(cart.subtotal()).toBe(13.5);
    cart.setQuantity(products[0].id, 0);
    expect(cart.lines()).toEqual([]);
  });

  it('does not add unavailable products or invalid quantities', () => {
    const cart = TestBed.inject(CartService);
    const products = TestBed.inject(ProductService).products();
    cart.addItem(products.find((product) => !product.available)!);
    cart.addItem(products[0], -1);
    cart.addItem(products[0], 1.5);
    expect(cart.totalQuantity()).toBe(0);
  });

  it('persists and restores the order', () => {
    const cart = TestBed.inject(CartService);
    cart.addItem(TestBed.inject(ProductService).products()[0], 2);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('sweetcrumb-cart-v1')!)).toEqual([
      { productId: '1', quantity: 2 },
    ]);
    TestBed.resetTestingModule();
    configure();
    expect(TestBed.inject(CartService).totalQuantity()).toBe(2);
  });

  it('sanitizes stale, duplicate, and malformed saved entries', () => {
    localStorage.setItem(
      'sweetcrumb-cart-v1',
      JSON.stringify([
        { productId: '1', quantity: 1000 },
        { productId: '1', quantity: 2 },
        { productId: 'missing', quantity: 1 },
        { productId: '9', quantity: 1 },
        { productId: '2', quantity: -2 },
        null,
      ]),
    );
    const cart = TestBed.inject(CartService);
    expect(cart.lines().length).toBe(1);
    expect(cart.totalQuantity()).toBe(18);
  });

  it('recovers from corrupt storage', () => {
    localStorage.setItem('sweetcrumb-cart-v1', '{broken');
    expect(TestBed.inject(CartService).lines()).toEqual([]);
  });
  it('preserves saved IDs while the catalog is pending or unavailable, then reconciles inventory', () => {
    const saved = [
      { productId: '1', quantity: 30 },
      { productId: 'missing', quantity: 2 },
    ];
    localStorage.setItem('sweetcrumb-cart-v1', JSON.stringify(saved));
    products.set([]);
    loaded.set(false);
    const cart = TestBed.inject(CartService);
    TestBed.tick();
    expect(cart.lines()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('sweetcrumb-cart-v1')!)).toEqual(saved);
    // A failed request leaves loaded=false and does not publish an empty catalog.
    TestBed.tick();
    expect(cart.totalQuantity()).toBe(32);
    products.set(TEST_PRODUCTS);
    loaded.set(true);
    expect(cart.totalQuantity()).toBe(18);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('sweetcrumb-cart-v1')!)).toEqual([
      { productId: '1', quantity: 18 },
    ]);
  });

  it('reconciles lower stock and sold-out products when the catalog refreshes', () => {
    const cart = TestBed.inject(CartService);
    cart.addItem(TEST_PRODUCTS[0], 10);
    products.set(TEST_PRODUCTS.map((product) => ({ ...product, inventoryQuantity: 3 })));
    expect(cart.quantityFor('1')).toBe(3);
    cart.setQuantity('1', 100);
    expect(cart.quantityFor('1')).toBe(3);
    products.set(TEST_PRODUCTS.map((product) => ({ ...product, inventoryQuantity: 0 })));
    expect(cart.totalQuantity()).toBe(0);
    expect(cart.subtotal()).toBe(0);
  });
});
