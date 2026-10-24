// "How far it travels": where a supermarket's veg usually comes from out of season, and the road, sea or air
// route it takes to Oxford, against our farms. Places are [longitude, latitude]. Distances are worked out here
// at build time, so the page shows them even without JavaScript.

import { readFileSync } from "node:fs";

const HOME = { name: "Cowley", at: [-1.2335, 51.747] };

// Where each supplier in site.json is, from its postcode (postcodes.io) unless noted. Check the uncertain ones
// with Maryam; a supplier with no pin here is left off the map and a warning is printed at build time.
const PINS = {
  "Oxford City Farm": [-1.2306, 51.7348],     // Cornwallis Road, OX4 3NH
  "Blacklands Organic": [-1.6658, 51.6168],   // Blacklands Organics, Westmill, Watchfield, SN6 8TH
  "Brighthampton": [-1.4449, 51.7288],        // the hamlet by Standlake (OpenStreetMap); no farm address found
  "Willow Brooke": [-1.2852, 51.8439],        // assumed to be Willowbrook Farm, Hampton Gay, OX5 2QQ
  "Proof Social Bakery": [-1.2367, 51.7056],  // Proof Social Bakehouse, Sandford Lane, Kennington, OX1 5RP
};
const site = JSON.parse(readFileSync(new URL("./site.json", import.meta.url), "utf8"));
const FARMS = site.suppliers.flatMap(({ name }) => {
  if (PINS[name]) return [{ name, at: PINS[name] }];
  console.warn(`[foodmiles] no map pin for supplier "${name}"; add one to PINS in _data/foodmiles.js`);
  return [];
});

// One example each for the stall's staples (from the business plan): where a supermarket's usually comes from
// out of season, by what road, sea or air route, and which of our suppliers ours comes from. `them` and `us`
// caption the globe. Each trip is a list of legs; a leg is travelled by air, sea or road through the places
// listed, along the great circle between each pair. Only items with a real, documented import route are here:
// supermarket bread, eggs and kale are mostly British, so they aren't compared.
//   Potatoes: Egyptian new potatoes fill the UK's early season, roughly January to March.
//   Squash: the UK takes about 29% of South Africa's squash exports, mostly January to July.
//   Onions: New Zealand's fill the summer gap before the British crop, a few weeks most years.
//   Cut flowers: Kenya's flower farms round Lake Naivasha fly stems to Europe daily.
//   Tomatoes: Almería's greenhouses are the UK's main winter supply, by lorry over the Channel.
//   Spring onions: flown in from Mexico when British ones are out of season.
//   Radicchio: Treviso's, by lorry over the Alps and the Channel.
// TODO: check each `farm` with Maryam; they're examples picked from what each supplier grows.
const SOUTHAMPTON = [-1.4, 50.88], HEATHROW = [-0.45, 51.47];
const CALAIS = [1.86, 50.95], DOVER = [1.31, 51.13], LONDON = [-0.12, 51.5];
const CHANNEL = [[-10, 44], [-5.8, 48.2], [-2.5, 50.2], SOUTHAMPTON];
const TRIPS = [
  {
    produce: "Potatoes", farm: "Blacklands Organic",
    them: "A supermarket's new potatoes", us: "Local potatoes",
    place: "Nile Delta", from: "the Nile Delta, Egypt", by: "ship",
    legs: [
      { by: "sea", path: [[29.9, 31.2], [20, 34], [11, 37.5], [0, 37], [-5.6, 35.95], [-9.6, 37], ...CHANNEL] },
      { by: "road", path: [SOUTHAMPTON, [-1.32, 51.4], HOME.at] },
    ],
  },
  {
    produce: "Squash", farm: "Oxford City Farm",
    them: "A supermarket's squash", us: "Local squash",
    place: "Western Cape", from: "the Western Cape, South Africa", by: "ship",
    legs: [
      { by: "sea", path: [[18.42, -33.91], [14, -30], [4, -15], [-8, 0], [-18, 12], [-19, 22], [-14, 30], [-11, 37], ...CHANNEL] },
      { by: "road", path: [SOUTHAMPTON, [-1.32, 51.4], HOME.at] },
    ],
  },
  {
    produce: "Onions", farm: "Oxford City Farm",
    them: "A supermarket's onions", us: "Local onions",
    place: "New Zealand", from: "the Bay of Plenty, New Zealand", by: "ship",
    legs: [
      // across the Pacific and through the Panama Canal
      { by: "sea", path: [[176.17, -37.65], [-150, -25], [-110, -10], [-85, 2], [-79.6, 8.9], [-79.9, 9.35], [-75, 15], [-65, 20], [-40, 35], [-15, 46], ...CHANNEL.slice(1)] },
      { by: "road", path: [SOUTHAMPTON, [-1.32, 51.4], HOME.at] },
    ],
  },
  {
    produce: "Cut flowers", farm: "Oxford City Farm",
    them: "A supermarket's flowers", us: "Local flowers",
    place: "Naivasha", from: "Lake Naivasha, Kenya", by: "air",
    legs: [
      { by: "road", path: [[36.43, -0.72], [36.93, -1.32]] },
      { by: "air", path: [[36.93, -1.32], HEATHROW] },
      { by: "road", path: [HEATHROW, HOME.at] },
    ],
  },
  {
    produce: "Tomatoes", farm: "Oxford City Farm",
    them: "A supermarket's tomatoes", us: "Local tomatoes",
    place: "Almería", from: "Almería, Spain", by: "lorry",
    legs: [
      { by: "road", path: [[-2.46, 36.84], [-3.7, 40.42], [-3.7, 42.34], [-1.79, 43.34], [-0.58, 44.84], [0.34, 46.58], [1.9, 47.9], [2.35, 48.86], [2.3, 49.89], CALAIS] },
      { by: "sea", path: [CALAIS, DOVER] },
      { by: "road", path: [DOVER, LONDON, HOME.at] },
    ],
  },
  {
    produce: "Spring onions", farm: "Oxford City Farm",
    them: "A supermarket's spring onions", us: "Local spring onions",
    place: "Mexico", from: "Mexico", by: "air",
    legs: [
      { by: "air", path: [[-99.07, 19.44], HEATHROW] },
      { by: "road", path: [HEATHROW, HOME.at] },
    ],
  },
  {
    produce: "Radicchio", farm: "Blacklands Organic",
    them: "A supermarket's radicchio", us: "Local radicchio",
    place: "Treviso", from: "Treviso, Italy", by: "lorry",
    legs: [
      { by: "road", path: [[12.24, 45.67], [10.99, 45.44], [9.19, 45.46], [7.32, 45.74], [6.14, 46.2], [5.04, 47.32], [4.03, 49.26], [2.78, 50.29], CALAIS] },
      { by: "sea", path: [CALAIS, DOVER] },
      { by: "road", path: [DOVER, LONDON, HOME.at] },
    ],
  },
];

const rad = (d) => (d * Math.PI) / 180;
// great-circle distance in miles
function miles([lng1, lat1], [lng2, lat2]) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}
const pathMiles = (path) => path.slice(1).reduce((sum, p, i) => sum + miles(path[i], p), 0);

// nearest first: they're numbered in this order on the map and in the list beside it
const farms = FARMS.map((f) => ({ ...f, miles: Math.round(miles(f.at, HOME.at)) })).sort((a, b) => a.miles - b.miles);
const ours = Math.max(...farms.map((f) => f.miles));

export default {
  home: HOME,
  farms,
  ours,
  trips: TRIPS.map((t) => {
    const total = Math.round(t.legs.reduce((sum, leg) => sum + pathMiles(leg.path), 0) / 10) * 10;
    const farm = farms.findIndex((f) => f.name === t.farm);
    if (farm < 0) throw new Error(`[foodmiles] ${t.produce} comes from "${t.farm}", which isn't a supplier with a pin`);
    // ours never rounds below a mile, so "times further" stays sensible
    const near = Math.max(1, farms[farm].miles);
    return { ...t, miles: total, farm, near, times: Math.round(total / near) };
  }),
};
