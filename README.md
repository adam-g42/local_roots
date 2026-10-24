# Local Roots

Website for Local Roots, a Sunday veg stall at Workshop Cafe in Cowley, Oxford.

It's a single page built with [Eleventy](https://www.11ty.dev/) and hosted free on Netlify. Every detail that changes (hours, address, socials, email, PayPal donation link, price tiers, suppliers, and the "Meet Maryam" words) lives in **one file: `src/_data/site.json`**. Maryam can also edit it from a form at `/admin`.

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

## Deploying (GitHub → Netlify)

1. Push this folder to a GitHub repo.
2. In [Netlify](https://app.netlify.com): **Add new site → Import an existing project → GitHub**, then pick the repo. `netlify.toml` already sets the build command (`npm run build`) and the publish folder (`_site`).
3. **Site configuration → Change site name** → `localrootsoxford`. This only sets the backup address, **https://localrootsoxford.netlify.app**; the real one is the domain below.
4. **Forms:** in **Forms**, click *Enable form detection* and redeploy. The *volunteer* and *contact* forms will show up there. Under **Forms → Form notifications**, add an email notification so submissions go to Maryam. Send a test message from the live site to check it works.

Every push to `main` redeploys automatically, in about a minute.

### Free hosting options

| Host | Free address | Notes |
|---|---|---|
| **Netlify** (used here) | `*.netlify.app` | Built-in forms (100 submissions/month free), works with Decap CMS login |
| Cloudflare Pages | `*.pages.dev` | Very fast, but forms would need a service like Formspree |
| GitHub Pages | `*.github.io` | Simplest, but no forms and no build-time login for the editor |

There's no reliable *free* custom domain. A `.co.uk` like `localroots.co.uk` costs about £5–10 a year from Cloudflare Registrar, Porkbun or Namecheap. To connect one in Netlify, go to **Domain management → Add a domain** and follow the DNS steps. HTTPS is set up automatically. Then update `url` in `site.json`.

## Editing the site (for Maryam)

The form at **https://localrootsoxford.co.uk/admin** edits everything in `site.json`. You log in with GitHub, and each time you press **Publish** the site updates about a minute later.

### One-time setup (whoever owns the repo does this)

1. **Create a GitHub OAuth app.** On GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Application name: `Local Roots editor`
   - Homepage URL: `https://localrootsoxford.co.uk`
   - Authorization callback URL: `https://api.netlify.com/auth/done`

   Click *Register*, then *Generate a new client secret*. Keep this page open.
2. **Connect it to Netlify.** In Netlify, go to **Site configuration → Access & security → OAuth → Install provider → GitHub**. Paste the Client ID and Client secret.
3. **Give Maryam access.** She makes a free GitHub account. In the repo, go to **Settings → Collaborators → Add people** and invite her. She accepts the email invite.
4. Make sure `repo:` in `src/admin/config.yml` matches the repo, e.g. `yourname/local-roots`. The repo is private, so the config also asks GitHub for private-repo access (`auth_scope: repo`).

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
src/js/main.js           "open now" line and the share button
src/admin/               Decap CMS editor
src/local-roots.ics.njk  "Add to calendar" file (repeats every week)
src/og-image.njk         template for the share image
src/images/              photos, one full-size file each; the build makes the smaller sizes into /img/
src/images/brand/        logo, icons, the paper texture and the share image, used as they are
```
