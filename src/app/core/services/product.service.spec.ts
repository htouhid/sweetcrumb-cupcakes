import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { productRow } from '../testing/products.fixture';
import { ProductRow } from '../models/product';
import { mapProduct } from '../models/product.mapper';
import { ProductService } from './product.service';
import { SupabaseService } from './supabase.service';

describe('ProductService', () => {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), returns: vi.fn() };
  const client = { from: vi.fn() };
  beforeEach(() => {
    for (const method of Object.values(query)) method.mockReset().mockReturnValue(query);
    query.returns.mockResolvedValue({ data: [productRow()], error: null });
    client.from.mockReset().mockReturnValue(query);
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client } }],
    });
  });

  it('loads the public catalog once and filters featured/category/slug locally', async () => {
    query.returns.mockResolvedValue({
      data: [
        productRow(),
        productRow({
          id: '2',
          slug: 'vegan-lemon',
          category: 'Vegan Cupcakes',
          is_featured: false,
        }),
      ],
      error: null,
    });
    const catalog = TestBed.inject(ProductService);
    expect(catalog.loading()).toBe(true);
    await Promise.all([catalog.loadProducts(), catalog.loadProducts()]);
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith('products');
    expect(query.eq).toHaveBeenCalledWith('is_available', true);
    expect(catalog.products()).toHaveLength(2);
    expect(catalog.featured()).toHaveLength(1);
    expect(catalog.byCategory('vegan-cupcakes')[0].slug).toBe('vegan-lemon');
    expect(catalog.byCategory('all')).toHaveLength(2);
    expect(catalog.bySlug('strawberry-dream')?.image).toBe('/images/products/strawberry-dream.png');
    expect(catalog.bySlug('missing')).toBeUndefined();
    await catalog.loadProducts();
    expect(client.from).toHaveBeenCalledTimes(1);
    expect(catalog.loading()).toBe(false);
    expect(catalog.loaded()).toBe(true);
  });

  it('retains zero-stock available products for Sold Out display but excludes unavailable rows', async () => {
    query.returns.mockResolvedValue({
      data: [productRow({ inventory_quantity: 0 }), productRow({ id: '2', is_available: false })],
      error: null,
    });
    const catalog = TestBed.inject(ProductService);
    await catalog.loadProducts();
    expect(catalog.products()).toHaveLength(1);
    expect(catalog.products()[0].inventoryQuantity).toBe(0);
  });

  it('handles an empty result as a successful catalog', async () => {
    query.returns.mockResolvedValue({ data: [], error: null });
    const catalog = TestBed.inject(ProductService);
    await catalog.loadProducts();
    expect(catalog.loaded()).toBe(true);
    expect(catalog.error()).toBeNull();
    expect(catalog.products()).toEqual([]);
  });

  it('allows retry after failure and preserves a previous catalog if refresh fails', async () => {
    query.returns.mockResolvedValueOnce({ data: null, error: { message: 'private diagnostic' } });
    const catalog = TestBed.inject(ProductService);
    await catalog.loadProducts();
    expect(catalog.loaded()).toBe(false);
    expect(catalog.loading()).toBe(false);
    expect(catalog.error()).toBeTruthy();
    expect(catalog.error()).not.toContain('private diagnostic');
    await catalog.loadProducts();
    expect(catalog.products()).toHaveLength(1);
    query.returns.mockRejectedValueOnce(new Error('offline'));
    await catalog.loadProducts(true);
    expect(catalog.products()).toHaveLength(1);
    expect(catalog.loaded()).toBe(true);
    expect(catalog.error()).toBeTruthy();
  });

  it('publishes only a complete catalog when a result spans multiple pages', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => productRow({ id: `${index}` }));
    query.returns
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: [productRow({ id: '1000' })], error: null });
    const catalog = TestBed.inject(ProductService);
    await catalog.loadProducts();
    expect(catalog.products()).toHaveLength(1001);
    expect(query.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('does not publish a partial catalog if a later page fails', async () => {
    query.returns
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, () => productRow()),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: {} });
    const catalog = TestBed.inject(ProductService);
    await catalog.loadProducts();
    expect(catalog.loaded()).toBe(false);
    expect(catalog.products()).toEqual([]);
  });
});

describe('product row mapping', () => {
  it('maps database fields, normalizes categories, and preserves local images', () => {
    const product = mapProduct(
      productRow({ category: 'Mini Cupcakes', price: '14.50', flavor: null, description: null }),
    );
    expect(product.category).toBe('mini-cupcakes');
    expect(product.price).toBe(14.5);
    expect(product.inventoryQuantity).toBe(18);
    expect(product.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(product.description).toBe('');
    expect(product.image).toBe('/images/products/strawberry-dream.png');
  });
  it('uses the existing image fallback for absent or nonlocal image paths', () => {
    for (const image_url of [
      null,
      '',
      'https://example.test/image.png',
      '//example.test/image.png',
    ]) {
      expect(mapProduct(productRow({ image_url })).image).toBe('/images/products/placeholder.svg');
    }
  });
  it('rejects invalid price or inventory instead of publishing a misleading cart total', () => {
    for (const changes of [
      { price: 'invalid' },
      { price: -1 },
      { inventory_quantity: -1 },
      { inventory_quantity: 1.5 },
    ] satisfies Partial<ProductRow>[]) {
      expect(() => mapProduct(productRow(changes))).toThrow();
    }
  });
});
