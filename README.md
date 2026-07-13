# Pro Validation & Checkout Customizations

A comprehensive Shopify app designed to give merchants complete control over checkout validations, checkout UI banners, delivery customizations, and payment customizations. Built on Node.js, Express, React, Vite, and Polaris, using the latest Shopify CLI and app extension framework.

---

## 🚀 Key Features

* **Cart & Checkout Validations**: Create rules to block or warn customers during checkout based on cart contents, customer details, or order values.
* **Checkout UI Extensions**: Dynamically render warnings, critical banners, and error messages directly on the checkout page to guide buyers.
* **Delivery Customizations**: Rename, reorder, or hide shipping methods at checkout based on customized conditions (e.g., hiding express or free shipping).
* **Payment Customizations**: Hide, reorder, or rename payment methods based on checkout data.
* **Rule Builder Dashboard**: A user-friendly React/Polaris interface to manage, template, and version checkout validation and customization rules.
* **Version Control & Rollbacks**: Automatically track historical versions of configuration rules and perform instant rollbacks from the dashboard.

---

## ⚠️ Important Configuration Steps

To ensure that the validation rules and shipping customization rules work seamlessly without errors or conflicts, pay close attention to these two configurations:

> [!IMPORTANT]
> **Enable Checkout Rules**: 
> 1. Go to your **Shopify Admin** -> **Settings** -> **Checkout** -> **Checkout Rules**.
> 2. Click **Add Rule**.
> 3. Select your validation rule (`cart-checkout-validation`) and click **Activate**.
> 
> *Without this step, Shopify will not execute the custom validation function at checkout.*

> [!TIP]
> **How to control Free Shipping Thresholds easily from the App:**
> 
> To avoid conflicts between Shopify's built-in shipping settings and this app's rules, follow these steps:
> 
> 1. **In Shopify Admin Settings**:
>    * Go to **Settings > Shipping and delivery**.
>    * Set your **"Free Shipping"** rate's minimum order price to **$0**. (This makes the rate theoretically eligible for all orders).
> 
> 2. **In This App**:
>    * Create a **Delivery Customization** rule.
>    * Set the target method to **"Free Shipping"** and set the action to **Hide**.
>    * Add a **Minimum Order Value** condition (e.g. *Less than* `1000.00`).
> 
> **Result**: The app will handle hiding the rate dynamically, giving you 100% control over the threshold ($50, $1000, etc.) directly from the app dashboard!

---

## 🔍 Deep-Dive: How the App Works

This application utilizes Shopify's modern **Checkout Extensibility** architecture to execute customizations and validations with zero performance impact on the checkout experience.

### 1. Unified Rules & Conditions Engine
You can build complex logical rules using either `AND` or `OR` operator combinations. The engine checks:
* **Order & Cart Values**: Minimum/Maximum Order Value, Cart Item Quantity Limits, Weight Limit (kg), SKU Count Limits.
* **Customer Attributes**: Customer Tags, Login status requirement, B2B/Wholesale account checking, Age Verification.
* **Shipping & Location Constraints**: PO Box detection, Blocked State/Country codes, Blocked ZIP Code patterns, and custom Shipping Address regular expressions (regex).
* **Product & Inventory Constraints**: Restricted Collections, Restricted Vendors, Incompatible Product Combinations (e.g. cannot mix hazardous items with normal shipping), Subscription checks, and Hazardous item checks.

### 2. Extension Architecture & Data Flow

#### **Cart & Checkout Validation Function (`cart-checkout-validation`)**
* **Type**: Shopify Function (`cart.validations.generate.run`)
* **Behavior**: Runs securely in WebAssembly (Wasm) directly on Shopify's servers. It retrieves active validation rules stored in the `cart-validation` metafields. If conditions match, it returns validation errors matching the target field (e.g. `$.cart` or address fields), which Shopify displays to block the checkout progress.

#### **Checkout UI Extension (`checkout-ui`)**
* **Type**: UI Extension (`purchase.checkout.block.render`)
* **Behavior**: Automatically reads the configuration rules. It renders warning banners, notices, and instructions inline on the checkout screen to guide customers prior to submission.

#### **Delivery Customization Function (`delivery-customization`)**
* **Type**: Shopify Function (`purchase.delivery-customization.run`)
* **Behavior**: Intercepts shipping rates during checkout. Allows you to:
  * **Hide**: Suppress delivery options based on cart thresholds, dimensions, or addresses.
  * **Rename**: Dynamically rewrite shipping rate titles (e.g., change "Standard Shipping" to "Express Shipping (Free Upgrade)").

#### **Payment Customization Function (`payment-customization`)**
* **Type**: Shopify Function (`purchase.payment-customization.run`)
* **Behavior**: Intercepts payment options. Hides or reorders specific payment methods based on checkout parameters.

### 3. Rule Versioning & Database Sync
Every time you update a rule inside the Rule Builder, the app:
1. Validates the configuration.
2. Writes the active configuration rules into Shopify **Metafields** so the checkout functions can read them instantly.
3. Automatically increments the version number and archives the older configuration in the database (`database.sqlite`).
4. Allows merchants to inspect previous settings and trigger an instant rollback to restore past configurations.

---

## 🛠️ Project Structure

This project is structured as a monorepo using npm workspaces:

```text
├── extensions/
│   ├── cart-checkout-validation/  # Shopify Function to validate carts/checkouts
│   ├── checkout-ui/               # Shopify UI extension for checkout banners/notices
│   ├── delivery-customization/    # Shopify Function to customize delivery options
│   └── payment-customization/     # Shopify Function to customize payment methods
├── web/
│   ├── index.js                   # Node/Express Backend server
│   ├── routes/                    # API endpoints (rules, templates, webhooks)
│   └── frontend/                  # React/Vite/Polaris Admin Dashboard
├── shopify.app.toml               # Shopify App Configuration file
└── package.json                   # Root package dependencies and scripts
```

---

## 💻 Local Development

### Requirements

1. **Node.js**: Download and install [Node.js](https://nodejs.org/en/download/) (v18+ recommended).
2. **Shopify Partners Account**: Create a [Shopify Partner account](https://partners.shopify.com/signup).
3. **Development/Sandbox Store**: Set up a Shopify development store or Shopify Plus sandbox store with Checkout Extensibility enabled.

### Setup & Run

1. Clone or navigate to the project directory.
2. Install the workspace dependencies:
   ```shell
   npm install
   ```
3. Run the Shopify development server:
   ```shell
   npm run dev
   ```
4. Follow the prompt to log in to your Shopify Partner account and link this project to your development app.
5. Open the generated tunnel URL to install the app on your development store.

---

## 📦 Deployment & Hosting

### 1. Build the Frontend
To build the React frontend production bundle:
```shell
cd web/frontend && SHOPIFY_API_KEY=YOUR_API_KEY npm run build
```

### 2. Host the Application
This app can be hosted on platforms like Heroku, Fly.io, or AWS. Make sure to:
* Configure your production database (e.g., MySQL, PostgreSQL) and update the session storage adapter if needed.
* Set the environment variable `NODE_ENV=production`.
* Set your `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and `HOST` environment variables.

---

## 📚 Developer Resources

* [Shopify Functions Documentation](https://shopify.dev/docs/apps/functions)
* [Checkout UI Extensions Documentation](https://shopify.dev/docs/api/checkout-ui-extensions)
* [Shopify App Bridge React](https://shopify.dev/docs/apps/tools/app-bridge/getting-started/using-react)
* [Polaris Component Library](https://polaris.shopify.com/)
