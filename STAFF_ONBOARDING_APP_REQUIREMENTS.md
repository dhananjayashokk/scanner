# Staff Store Onboarding Mobile App — Requirements

## Overview
A mobile app for internal staff to visit physical retail stores, onboard them onto the platform, and catalog their products and categories.

## Core Flows

### 1. Store Onboarding
- Staff logs in with their account
- Create a new store profile (name, address, contact, store type)
- Or search and claim an existing unverified store record

### 2. Category Management
- View a global/master list of categories
- Map existing categories to the store
- Create new categories (saved to master list, auto-mapped to store)

### 3. Product/Item Management
- Browse master product catalog (searchable by name, barcode, SKU)
- Map existing products to the store (set price, availability)
- Add a new product (saved to master catalog + auto-mapped to current store)
  - Fields: name, description, images, barcode/SKU, category, unit
- Edit store-specific overrides: price, stock status, custom name

## Data Model (key concepts)

| Entity | Description |
|---|---|
| `stores` | Individual retail locations |
| `categories` | Global master list, reusable across stores |
| `products` | Global master catalog (canonical product records) |
| `store_categories` | Join: which categories a store carries |
| `store_products` | Join: which products a store carries, with price/stock overrides |

## Tech Constraints
- React Native (Expo) preferred
- Auth via existing staff auth system
- Offline-capable for cataloging (sync on reconnect)
- Camera support for barcode scanning and product photo capture
- Backend: REST or Supabase (match existing infra)

## Out of Scope
- Customer-facing features
- Inventory/stock management
- Order processing
