# Local Roots

Website for Local Roots, a Sunday veg stall at Workshop Cafe in Cowley, Oxford.

It's a single page built with [Eleventy](https://www.11ty.dev/) and hosted free on Cloudflare Pages. Every detail that changes (hours, address, socials, email, PayPal donation link, price tiers, suppliers, and the "Meet Maryam" words) lives in **one file: `src/_data/site.json`**. Maryam can also edit it from a form at `/admin`.

## Before going live: fill in the placeholders

In `src/_data/site.json`, or through `/admin` once that's set up:

| Field | Now | Change to |
|---|---|---|
| `contact.email` | `hello@example.com` | the real address |
| `contact.instagram` | `TODO-instagram-handle` | the handle, without the @ |
| `contact.donate` | `https://www.paypal.com/donate/?hosted_button_id=TODO` | the PayPal Donate button link |
| `location.postcode`, `lat`, `lng` | empty | add these to show a map pin (otherwise a photo is shown) |
| `suppliers[].website` | mostly empty | farm websites, if they have one |
| `tiers[].example` | £1.00 / £1.80 / £2.50 | real prices for the example item |
| `FARMS` in `src/_data/foodmiles.js` | rough pins for Brighthampton and Oxford City Farm | each farm's real location; these set the "Local Roots: N miles" figure in *How far it travels* |

`repo:` in `src/admin/config.yml` is `adam-g42/local_roots`; change it if the repo moves.

## Working on it locally

```sh
npm install
npm start          # http://localhost:8080
```

## Deploying (GitHub → Cloudflare Pages)

Cloudflare Pages builds the site from the `main` branch (`npm run build`, output `_site`) and serves it at **https://localrootsoxford.co.uk**, with **https://localrootsoxford.pages.dev** as the backup address. Every push to `main` redeploys automatically, in about a minute.

Alongside the pages, Cloudflare runs three small handlers in `functions/api/`:

- `form.js`: the volunteer and contact forms post here, and each one is emailed through [Resend](https://resend.com).
- `auth.js` and `callback.js`: the editor's "Login with GitHub".

They use these settings, under **Workers & Pages → localrootsoxford → Settings → Variables and secrets**:

| Name | What it is |
|---|---|
| `RESEND_API_KEY` | from Resend → API Keys |
| `FORM_TO` | where form messages go (commas for more than one) |
| `FORM_FROM` | the sender, e.g. `Local Roots <forms@localrootsoxford.co.uk>`; the domain must be verified in Resend |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | from the GitHub OAuth app (below) |

Response headers (caching, the calendar file's type) are in `src/_headers`.

To try the forms and the login on your own computer, put the settings above in a `.dev.vars` file (one `NAME=value` per line; it's ignored by git), then:

```sh
npm run build
npx wrangler pages dev _site     # http://localhost:8788
```

## Editing the site (for Maryam)

The form at **https://localrootsoxford.co.uk/admin** edits everything in `site.json`. You log in with GitHub, and each time you press **Publish** the site updates about a minute later.

### One-time setup (whoever owns the repo does this)

1. **Create a GitHub OAuth app.** On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Application name: `Local Roots editor`
   - Homepage URL: `https://localrootsoxford.co.uk`
   - Authorization callback URL: `https://localrootsoxford.co.uk/api/callback`

   Click *Register*, then *Generate a new client secret*. Keep this page open.
2. **Connect it to Cloudflare.** Add the Client ID and Client secret as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` (see *Deploying* above), then redeploy.
3. **Give Maryam access.** She makes a free GitHub account. In the repo, go to **Settings → Collaborators → Add people** and invite her. She accepts the email invite.
4. Make sure `repo:` in `src/admin/config.yml` matches the repo, e.g. `yourname/local-roots`.

### Day to day

1. Go to `/admin` and click **Login with GitHub**.
2. Open **Website → Opening times, contact & everything else**.
3. Change what you need: hours, a "no stall this week" notice, prices, a new farm, photos and so on. The veg in the moving strip, with their recipe ideas, are under **Website → In season**.
4. Click **Publish → Publish now**.

**Photos:** upload one full-size photo; the site makes the smaller phone and desktop versions itself. Use JPEG or PNG. iPhones convert their photos to JPEG when uploading from the phone, but a `.heic` file dragged in from a Mac can't be read, and the site won't update until it's swapped for a JPEG.

**Made a mistake?** Change it back in the form and publish again. Every save is also kept in the repo's history on GitHub, so any old version can be restored.

### Trying the editor on your own computer

```sh
npm start          # in one terminal
npm run cms        # in another; edits save straight to site.json, no login needed
```
Then open http://localhost:8080/admin/.

## The share image

`src/images/brand/og-share.jpg` is the picture shown when someone shares the link on WhatsApp, Facebook and so on. It's drawn from `site.json`. After changing the hours or tagline, redraw it with:

```sh
npm start          # in one terminal
npm run og         # needs Google Chrome installed
```
Then commit the new image. Social apps cache previews, so a changed image can take a day or two to show up.

## What's where

```
src/_data/site.json      all the editable details
src/_data/produce.json   the veg in the "In season" strip, with their photos and recipe ideas
src/index.njk            the page
src/_includes/map.svg    the hand-drawn Oxford map in the hero (generated, don't edit directly)
scripts/map-source.svg   the map to edit; then run `npm run map` to bake in the pen wobble
scripts/map-details.mjs  draws the terraces, trees, ripples and hill shading into the source: `npm run map:details`
src/css/style.css        styles (colours and fonts at the top)
src/js/main.js           "open now" line, the share button and the recipe cards
functions/api/           form emails and the editor login, run by Cloudflare
src/admin/               Decap CMS editor
src/local-roots.ics.njk  "Add to calendar" file (repeats every week)
src/og-image.njk         template for the share image
src/images/              photos, one full-size file each; the build makes the smaller sizes into /img/
src/images/brand/        logo, icons, the paper texture and the share image, used as they are
```
