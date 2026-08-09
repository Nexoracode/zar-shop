# Storefront architecture

The public storefront is selected on the server from `StoreSetting.industry`.

- `gold/`: gold-specific presentation (live gold price, making fee, weight and investment content).
- `general/`: regular ecommerce presentation (fixed prices and general merchandising content).
- `shared/`: presentation contracts and components that do not encode an industry.
- `resolve-storefront.ts`: resolves the homepage with dynamic imports, so only the active template is rendered.
- `resolve-chrome.tsx`: resolves the matching header and footer.

Domain services, authentication, cart, checkout and payment stay under `src/modules` and are shared. Public product queries must always filter by the current `StoreSetting.industry`. Homepage configuration for `GENERAL` is stored separately from the legacy/current gold homepage configuration.
