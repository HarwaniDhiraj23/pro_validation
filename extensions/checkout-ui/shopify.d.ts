import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/Checkout.jsx' {
  const shopify:
    | import('@shopify/ui-extensions/purchase.checkout.block.render').Api
    | import('@shopify/ui-extensions/purchase.checkout.contact.render-after').Api
    | import('@shopify/ui-extensions/purchase.checkout.delivery-address.render-after').Api
    | import('@shopify/ui-extensions/purchase.checkout.shipping-option-list.render-before').Api
    | import('@shopify/ui-extensions/purchase.checkout.shipping-option-list.render-after').Api
    | import('@shopify/ui-extensions/purchase.checkout.payment-method-list.render-before').Api
    | import('@shopify/ui-extensions/purchase.checkout.payment-method-list.render-after').Api
    | import('@shopify/ui-extensions/purchase.checkout.actions.render-before').Api
    | import('@shopify/ui-extensions/purchase.checkout.cart-line-list.render-after').Api
    | import('@shopify/ui-extensions/purchase.checkout.cart-line-item.render-after').Api
    | import('@shopify/ui-extensions/purchase.checkout.reductions.render-before').Api
    | import('@shopify/ui-extensions/purchase.checkout.reductions.render-after').Api
    | import('@shopify/ui-extensions/purchase.checkout.footer.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}
