# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start the Expo dev server (scan QR with Expo Go app)
npx expo start

# Run on specific platform
npx expo start --android
npx expo start --ios
npx expo start --web
```

There are no tests in this project.

## Architecture

This is a React Native (Expo) staff onboarding app using **Expo Router** (file-based navigation). The entry point is `expo-router/entry` (set in `package.json`). `App.js` and `index.js` at the root are the old single-screen prototype and are no longer the active entry point.

### Navigation structure (`app/`)

```
app/
  _layout.js              Root layout — auth guard, redirects based on login state
  (auth)/
    _layout.js            No header
    login.js              Email + password login via Supabase RPC
  (app)/
    _layout.js            Header with "Sign Out" button
    stores.js             List stores for org + "New Store" modal → navigates to categories
    categories.js         Enable/disable categories for a store → navigates to products
    products.js           List store products per category + add from master catalog or scan
    scan.js               Camera + AI analysis (Kimi K2.5) → save new product to store
```

**Auth flow:** `app/_layout.js` subscribes to `auth.onAuthStateChange()`. Unauthenticated → redirected to `/(auth)/login`. Authenticated → redirected to `/(app)/stores`.

### Data layer (`src/db/`)

All DB calls go directly to Supabase (no calls to the retail-sass REST API):

| File | Tables accessed | Key functions |
|---|---|---|
| `stores.js` | `stores` | `getStores(orgId)`, `createStore({...})`, `getStoreById(id)` |
| `categories.js` | `product_categories`, `store_categories`, `tax_configuration` | `getAllCategories()`, `getStoreCategories(storeId)`, `enableCategoryForStore`, `disableCategoryForStore`, `createCategoryAndEnableForStore` |
| `products.js` | `product_master`, `product_variant_combinations`, `store_products`, `brands` | `searchMasterProducts({query, categoryIds})`, `getStoreProducts(storeId)`, `addProductToStore`, `createProductFromScan`, `updateStoreProduct` |

### Auth layer (`src/lib/supabase.js`)

- Supabase client configured with `persistSession: false` (stateless)
- Custom `auth` object wraps a Supabase RPC call (`login(p_email, p_password)`) and stores the user in memory
- `auth.getUser()` returns the current in-memory user (includes `organization_id`)
- `auth.onAuthStateChange(fn)` — subscribe to login/logout events

### AI layer (`src/api/kimiApi.js`)

- Calls Moonshot AI API at `https://api.moonshot.ai/v1`
- Default model: `kimi-k2.5` with fallback to `moonshot-v1-128k-vision-preview` on engine overload
- Accepts up to 3 base64 images, returns a structured JSON object with 11 product fields
- `DEFAULT_API_KEY` is hardcoded in `scan.js` (not read from `.env`)

### Key data relationships

```
stores (organization_id) → store_categories (store_id, category_id, is_active)
                         → store_products   (store_id, product_combination_id, price, mrp, ...)

product_categories ← store_categories
product_master → product_variant_combinations ← store_products
```

`store_categories` is the mapping created when a staff member enables a category for a store.
`store_products` is the mapping created when a product variant is added to a store with pricing.
