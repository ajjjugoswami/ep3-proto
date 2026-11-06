# EP3 Admin prototype

Static prototype of the EP3 admin firms and instruments flows. No build step and no backend: sample data is stored in the browser.

## Pages

| File | Screen |
| --- | --- |
| `index.html` | Log in |
| `firms.html` | Firm list |
| `firm.html?id=` | Firm profile and tabs (`&tab=users`, `accounts`, `position-limits`, `association`, `services`) |
| `firm-new.html` | Create a firm (`?type=` presets the type) |
| `firm-edit.html?id=` | Edit a firm |
| `user.html`, `account.html`, `service.html` | View a record (`?firm=&id=`), add one (`&mode=new`) or edit one (`&mode=edit`) |
| `api-keys.html`, `api-key.html` | A service's API keys |
| `instruments.html` | Instrument list |
| `instrument.html?id=` | View an instrument, or add, edit or copy one (`&mode=new`, `edit`, `copy`) |
| `instrument-state.html?id=` | Change state, EOD actions and resolution (`?ids=` takes a JSON array) |
| `instrument-stats.html?id=`, `instrument-history.html?id=` | Market stats and history |
| `books.html?instrumentId=` | Limit and stop book |
| `products.html`, `product.html?id=` | Products |
| `calendars.html` | Holiday calendars |

Shared code is in `assets/`.

## Run locally

Open `index.html` in a browser. Any username and password logs in.

## Deploy

Import the repo in Vercel with no framework preset and no build command. `vercel.json` removes the `.html` from URLs.
