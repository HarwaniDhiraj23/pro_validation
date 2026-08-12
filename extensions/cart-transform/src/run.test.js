import { describe, it, expect } from 'vitest';
import { run } from './run.js';

describe('Cart Transform Function', () => {
  it('returns empty operations when no metafield rules exist', () => {
    const input = {
      cartTransform: { metafield: null },
      cart: { lines: [] }
    };
    const result = run(input);
    expect(result.operations).toEqual([]);
  });

  it('handles kit expansion operation correctly', () => {
    const rules = [
      {
        id: 1,
        status: 'active',
        transform_type: 'kit_expansion',
        transform_config: {
          parent_variant_id: 'gid://shopify/ProductVariant/100',
          components: [
            { variant_id: 'gid://shopify/ProductVariant/101', quantity: 1, fixed_price: '29.99' },
            { variant_id: 'gid://shopify/ProductVariant/102', quantity: 2, fixed_price: '15.00' }
          ]
        }
      }
    ];

    const input = {
      cartTransform: {
        metafield: { value: JSON.stringify(rules) }
      },
      cart: {
        lines: [
          {
            id: 'gid://shopify/CartLine/1',
            quantity: 2,
            merchandise: { id: 'gid://shopify/ProductVariant/100' }
          }
        ]
      }
    };

    const result = run(input);
    expect(result.operations.length).toBe(1);
    expect(result.operations[0].expand).toBeDefined();
    expect(result.operations[0].expand.cartLineId).toBe('gid://shopify/CartLine/1');
    expect(result.operations[0].expand.expandedCartItems.length).toBe(2);
    expect(result.operations[0].expand.expandedCartItems[0].quantity).toBe(2); // 1 * 2 parent qty
    expect(result.operations[0].expand.expandedCartItems[1].quantity).toBe(4); // 2 * 2 parent qty
  });

  it('handles line item price override operation correctly', () => {
    const rules = [
      {
        id: 2,
        status: 'active',
        transform_type: 'price_override',
        transform_config: {
          target_variant_ids: ['gid://shopify/ProductVariant/200'],
          override_price: '49.99',
          custom_title: 'VIP Special Pricing'
        }
      }
    ];

    const input = {
      cartTransform: {
        metafield: { value: JSON.stringify(rules) }
      },
      cart: {
        lines: [
          {
            id: 'gid://shopify/CartLine/2',
            quantity: 1,
            merchandise: { id: 'gid://shopify/ProductVariant/200' }
          }
        ]
      }
    };

    const result = run(input);
    expect(result.operations.length).toBe(1);
    expect(result.operations[0].update).toBeDefined();
    expect(result.operations[0].update.cartLineId).toBe('gid://shopify/CartLine/2');
    expect(result.operations[0].update.price.adjustment.fixedPricePerUnit.amount).toBe('49.99');
    expect(result.operations[0].update.title).toBe('VIP Special Pricing');
  });

  it('handles product bundling merge operation correctly', () => {
    const rules = [
      {
        id: 3,
        status: 'active',
        transform_type: 'bundling',
        transform_config: {
          parent_variant_id: 'gid://shopify/ProductVariant/300',
          component_variant_ids: [
            'gid://shopify/ProductVariant/301',
            'gid://shopify/ProductVariant/302'
          ],
          bundle_price: '99.00',
          bundle_title: 'Ultimate Starter Pack'
        }
      }
    ];

    const input = {
      cartTransform: {
        metafield: { value: JSON.stringify(rules) }
      },
      cart: {
        lines: [
          {
            id: 'gid://shopify/CartLine/3A',
            quantity: 1,
            merchandise: { id: 'gid://shopify/ProductVariant/301' }
          },
          {
            id: 'gid://shopify/CartLine/3B',
            quantity: 1,
            merchandise: { id: 'gid://shopify/ProductVariant/302' }
          }
        ]
      }
    };

    const result = run(input);
    expect(result.operations.length).toBe(1);
    expect(result.operations[0].merge).toBeDefined();
    expect(result.operations[0].merge.parentVariantId).toBe('gid://shopify/ProductVariant/300');
    expect(result.operations[0].merge.cartLines.length).toBe(2);
    expect(result.operations[0].merge.price.adjustment.fixedPricePerUnit.amount).toBe('99.00');
    expect(result.operations[0].merge.title).toBe('Ultimate Starter Pack');
  });
});
