# EP3 Admin prototype

A static, clickable redesign of the EP3 admin console's firms and instruments flows. It is a replica of the real admin UI with better UI and UX, not a new product. There is no build step and no backend: sample data lives in the browser.

The source of truth for behaviour, field order, labels and rules is the real app at `D:\DCO repos\ep3-admin-ui`. Check its code before changing a flow.

## Run and deploy

- **Local:** open `index.html` in a browser. Any username and password logs in.
- **Vercel:** static site with no framework preset and no build command. `vercel.json` has `cleanUrls` off, because links use `.html` and a redirect would slow every click. A rewrite keeps URLs without `.html` working. Files in `assets/` are cached for 5 minutes, then served stale while they refresh, so a deploy can take a few minutes to reach returning visitors.
- **Page changes:** every click is a full page load. `@view-transition` in `app.css` fades between pages and keeps the sidebar still. It only works over HTTP or HTTPS, not when opening the file directly.
- `firms-redesign.html` is the old single-file version. It is in `.gitignore` and is not used.

## Structure

Each HTML file is a thin wrapper with `data-page` on `<body>`. All pages load the same CSS and scripts.

| Page | Screen | Query params |
|---|---|---|
| `index.html` | Log in, or Register with `register=true` | `register` |
| `firms.html` | Firm list | |
| `firm.html` | Firm profile and tabs | `id`, `tab` |
| `firm-new.html` | Create a firm | `type` (optional preset) |
| `firm-edit.html` | Edit a firm | `id` |
| `user.html`, `account.html`, `service.html` | View, add or edit a record | `firm`, `id`, `mode=new\|edit` |
| `api-keys.html` | A service's API keys | `firm`, `service` |
| `api-key.html` | View, add or edit a key | `firm`, `service`, `id`, `mode=new\|edit` |
| `instruments.html` | Instrument list and exchange-wide actions | |
| `instrument.html` | View, add, edit or copy an instrument | `id`, `mode=new\|edit\|copy`, `productId` (preset on new) |
| `instrument-stats.html` | Review market stats | `id` |
| `instrument-history.html` | Historical market stats | `id` |
| `books.html` | Unaggregated limit and stop book | `instrumentId` |
| `products.html`, `product.html` | Product list; view, add, edit or copy a product | `id`, `mode=new\|edit\|copy` |
| `calendars.html` | Holiday calendars, agenda and week views | |

`tab` is one of `users`, `accounts`, `position-limits`, `association` or `services`.

| File in `assets/` | Purpose |
|---|---|
| `css/app.css` | All styles and the light and dark colour tokens |
| `js/theme-init.js` | Applies the theme in `<head>` to avoid a flash |
| `js/sprite.js` | Injects the logo and icon SVG sprite |
| `js/tips.js` | `TIPS`, the tooltip wording from the real app. Loads before `config.js` |
| `js/tooltip.js` | `tipHTML` and the tooltip bubble |
| `js/config.js` | Storage keys, firm types, field schema, tabs, associations, roles, record definitions, nav, `APP_INFO` |
| `js/seed.js` | Sample firms and the generator that fills their tabs |
| `js/core.js` | Page and URL helpers, storage, state, `hrefFor`, `go`, flash toasts |
| `js/ui.js` | Toasts, confirm dialog, menus, custom dropdowns |
| `js/date-picker.js` | Themed date, date-time and time pickers, and `formatWhen` |
| `js/shell.js` | Sidebar, theme, login page, license dialog |
| `js/register.js` | Register page, token parsing and password check |
| `js/firms-list.js` | Firm list, filters, sorting, pagination, firm actions |
| `js/firm-detail.js` | Firm header and tabs, profile, left section menu, shared read rows and collections |
| `js/firm-tabs.js` | Users, Accounts, Position Limits, Associations and Services tab content |
| `js/records.js` | User, account, service and API key pages |
| `js/firm-form.js` | Firm create and edit form, field rendering, validation, popup record forms |
| `js/market-config.js` | Instruments module options, tooltips, field rules and `FIELD_DEFS`, `parseItem`, `resolveField` |
| `js/market-sections.js` | Ordered section layouts per product type for instruments and products, filters, stats columns |
| `js/market-seed.js` | Sample products, instruments and holiday calendars |
| `js/market-core.js` | The `market` store, URL helpers, price and time formatting, module header, wide sheet, `renderMarketPage` |
| `js/market-fields.js` | Renders and validates sections, `startMarketForm`, custom blocks (`MARKET_BLOCKS`), trading hours sheet, date calculator |
| `js/instruments-list.js` | Instrument list, filters, selection, instrument menu, Halt All, Resume, refresh |
| `js/settlement-prices.js` | Export Data, CSV import and approval of settlement prices |
| `js/instrument-pages.js` | Instrument view page, form, validation and save |
| `js/instrument-state.js` | Change State dialog, EOD actions and resolution |
| `js/instrument-stats.js` | Market stats and historical market stats |
| `js/books.js` | Unaggregated book |
| `js/products.js` | Product list, view page, form and child instrument sync |
| `js/calendars.js` | Holiday calendars and events |
| `js/events.js` | Actions and document event listeners |
| `js/market-events.js` | Adds the instruments module's actions to `ACT`, and its listeners |
| `js/router.js` | Picks what to render for the current page, then boots the app |
| `samples/settlement-prices.csv` | Sample file for Import Settlement Prices |

## How the code works

- **Plain scripts, not ES modules.** This keeps double-clicking `index.html` working. Top-level `const` and functions are shared between files, so script order matters only for code that runs at load. New script files must be added to all 18 HTML files.
- **Rendering:** pages render into `#view` from template strings. Always pass dynamic values through `esc()`.
- **Actions:** add a `data-act` attribute and a matching entry in `ACT` in `events.js`, or in `market-events.js` for the instruments module.
- **Dropdowns:** render a normal `<select>`. `enhanceSelects()` replaces it with the themed dropdown automatically.
- **Dates and times:** render a normal `<input type="date">`, `datetime-local` or `time`. `enhanceDates()` in `date-picker.js` replaces it with the themed picker, and the hidden input keeps the ISO value. If you set `.value` from code, call `syncDateButton(input)`. Show stored values with `formatWhen()`. Don't use the browser's native pickers.
- **List state:** save filters, sort and page with `saveListState` and read them with `readListState`. They stay until the user resets them or logs off, including after closing the tab.
- **Links:** build URLs with `hrefFor`, `entityBase`, `entityHref` and `entityNewHref`.
- **Toasts across pages:** call `toast()` around `go()`. It is saved and shown on the next page.
- **Unsaved changes:** forms use `form.draft` and `isDirty()`. Leaving a dirty form asks first.
- **Data:** firms are stored in `localStorage` under `STORE_KEY`, and products, instruments and calendars under `MARKET_KEY`. Bump the version in `config.js` or `market-config.js` when the seed or data shape changes, because that discards saved data.
- **Instrument and product forms are schema driven.** A section lists items in the real field order: `key`, `key*` (required), `=key` (read-only mirror), `key|Label`, `#Subheading` or `#Subheading|tipKey`, `@block`. Field types come from `FIELD_RULES` and `FIELD_DEFS`. To change a type's form, edit `market-sections.js`, not the render code.
- **Module forms** use the same `form` object as firms, with a `form.module` holding `body`, `validate`, `submit` and `onChange`. Nested values use dotted field keys such as `legs.0.symbol`.
- **Sheets:** use `openFormSheet` for a form in a dialog and `openWideSheet` for a table in a dialog.
- **Lists:** set `listCtl` to the page's list state and refresh function, so `sortHeader`, `pagerHTML` and the shared sort and page actions work. Sort rows with `sortRows`, and draw the table with `patchListTable` rather than setting `innerHTML`.
- **Tooltips:** give a field a `tip`, either text or a function of the values, and `fieldRow` and `readRow` show it. Elsewhere use `tipHTML`.

## Rules copied from the real admin UI

Tabs by firm type, after Firm Profile:

| Firm type | Tabs |
|---|---|
| Participant | Users, Accounts, Position Limits, Firm Associations |
| Clearing Member | Users, Accounts, Position Limits, Firm Associations, Firm Services |
| Clearing House | Accounts, Position Limits, Firm Associations |
| Agent | Users, Firm Associations |
| Supervisor | Users, Firm Services |

- **Firm form order** follows `FirmForm.js`: Firm Name, Firm ID, Firm Type, Firm State, type-specific toggles, Participant Type, Organization Type, then the legal, contact and Main Address fields, Clearing Integration, and collapsible Alternate Legal Names, Key Personnel and Aliases.
- **Type-specific fields:** Participants get the 4 trading toggles, Disintermediated, Participant Type and Clearing Integration. Clearing Members get only Disintermediated.
- **Roles** depend on firm type, as in `UserRoleListContainer.js`.
- **Delete** is a soft delete for firms: Show Deleted, then Restore.

Instruments module, from `pages/Instruments.js`, `InstrumentForm.js` and `ProductForm.js`:

- **Tabs:** the Instruments sidebar item opens Products, Instruments and Calendars. Book and market stats pages keep the Instruments tab or link back to it.
- **Instrument Type comes from the Product.** Choosing a product replaces the form with its values and keeps the typed symbol and description. Routing Key defaults to the Product ID.
- **Editing by state:** Pending allows everything. Other states lock contract fields and all type-specific fields. Terminated is read-only, so its edit URL redirects to the view page.
- **Delete** is permanent and only allowed for Pending and Terminated. Review Market Stats is disabled for Pending and Terminated.
- **Terminated instruments** are hidden from the list until you filter by that state.
- **Halt All** skips Pending, Expired, Terminated, Halted and non-tradable instruments. **Resume** returns halted tradable instruments to their schedule.
- **Saving a new instrument** that has dates but isn't following its schedule asks whether to follow it. Either answer saves.
- **Market stats:** non-tradable instruments can edit everything. Tradable ones can only edit settlement, open interest, trading reference and mark values.
- **Pending** isn't offered as a state unless every selected instrument is Pending.
- **Sync Child Instruments** on a product copies that section to its instruments, except terminated ones.

## Design decisions the user asked for

Keep these unless told otherwise. The user wants a simple admin tool, not a fancy one.

- **Font:** Geist and Geist Mono, not Montserrat. Google Fonts is loaded from a CDN.
- **Theme:** Light and Dark only, in the sidebar, with no System option. Light is the default. Dark uses neutral near-black with white text. Light uses a neutral off-white sidebar and white panel. In both themes, sidebar icons are blue and the selected one is green.
- **App shell:** flat sidebar, with the content in a large rounded panel and thin scrollbars inset from the corners.
- **Sidebar:** no search and no user dropdown. Appearance sits in a card, Log Off is a red tinted left-aligned button below it, and the left-aligned environment and version are under that. The License row shows the expiry.
- **Login:** centred form with no card, logo above "Welcome back", eye icon on the password, no side panel or decorative shapes.
- **Change State:** opens as a dialog over the current page, for one instrument or a selection, not a separate page. Save applies straight away with no second confirmation. EOD actions and resolution are in the same dialog and do ask first.
- **Filter chips:** on the firm and instrument lists, each active filter shows as a chip below the filters, with an X to remove it and a Clear all link. These replace the Reset button. Show Deleted is a toggle, not a chip.
- **Firm list:** labelled Firm Name, Firm Type and Firm State filters that apply live, like the real UI. Name and Firm ID are separate columns, with no icons in the name cells. Row actions are View and Edit icons and a More menu, the same as the instrument list.
- **Instrument list:** keep the area above the table to one row. Product, Symbol, State and Type filters apply live, and the other filters sit behind More Filters. Export, settlement price actions, Resume and Halt All sit in one Actions menu, not a row of buttons. Row actions are View and Edit icons and a More menu rather than seven icons, and the actions column stays visible while the wide table scrolls.
- **Sortable columns:** firm, instrument and product lists sort from the column header, with an arrow always visible. Type and State columns don't sort. Sorting updates the rows in place and keeps column widths, so the table doesn't flicker. The first click sorts ascending, the next descending, and sorting returns to the first page. Blank values stay last. The real instrument grid has no sorting, so this is an addition there.
- **Tooltips:** a question-circle icon opens a themed bubble on hover or click, with the real app's full wording. Where the real app uses a tooltip, it replaces inline help text. The icons aren't in the tab order, so long forms stay quick to tab through.
- **Firm pages:** fixed header with underlined tabs. Only the content scrolls.
- **Forms:** real field order flowing into responsive columns, 44px inputs, Save then Cancel in a footer pinned to the bottom left.
- **Toasts:** top centre, one at a time, no Undo.
- **Buttons:** 8px radius, not pills.

## Coding rules

- No comments in CSS, and no unnecessary comments in code.
- No inline CSS. Use `app.css` and its colour tokens, and define new colours for both themes.
- Reuse existing helpers and components before adding new ones.
- Split code into the files above rather than growing one file.

## Not built yet

- An account's own tabs: Users, Positions, Balances, Ledger, Whitelist, Commissions, Associations, Bank Accounts and Position Limits.
- Every sidebar page except Firms and Instruments, including Change Password. They show a "not part of this prototype" message.
- Multi-factor enrollment on login and Single Sign On.
- Pagination on firm tabs, and the firm view page still groups fields where the real UI shows a plain list.
- Firm service pages use a back link, where the real UI keeps the firm tabs.

## Prototype-only behaviour

- **Auto Reload Positions** only remembers its setting, because sample positions never change.
- **Associations** save on one firm only and do not update the other firm.
- **Version and license values** are samples in `APP_INFO`. In the real app they come from `REACT_APP_VERSION` and the license API.
- **Logo** is a vector redraw from a screenshot, because the real file is not in either repo. Replace it in `sprite.js` when available.
- **Calculate Dates** runs in the browser. It skips weekends but ignores holiday calendars and day conventions, where the real app calls a date service.
- **Market data, history and books** are generated samples. Refresh Market Data nudges last prices, and books don't refresh on their own.
- **Instrument state** from the schedule uses the browser's clock, not `MARKET_TZ`. A scheduled state change applies the next time a page loads after its time.
- **Netting** is always on through `NETTING_ENABLED`, so event instruments always show Resolution. In the real app it is an environment setting.
- **Export Data** writes the list's columns. In the real app the server builds the file.
- **Product Question** is a plain text field, where the real UI suggests earlier questions.
- **Register:** nothing is saved, and any username and password still logs in. A token registers if it is a JWT with a `sub`, and anything else shows "Unable to register user." **Use a sample token** is only in the prototype. The password check runs in the browser with made-up rules, where the real app calls `checkPassword`.
- **Reset:** clear this site's browser data to restore the sample firms and instruments.

## Testing

There are no tests in this repo. Changes so far were checked with throwaway headless Edge scripts, plus screenshots in both themes. Check desktop and phone widths when changing layout.
