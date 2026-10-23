// "How far it travels": where a supermarket's veg usually comes from out of season, and the road, sea or air
// route it takes to Oxford, against our farms. Places are [longitude, latitude]. Distances are worked out here
// at build time, so the page shows them even without JavaScript.

const HOME = { name: "Cowley", at: [-1.2335, 51.747] };

// TODO: check these pins with Maryam; a farm only shows on the map once it has one
const FARMS = [
  { name: "Brighthampton", at: [-1.418, 51.728] },
  { name: "Oxford City Farm", at: [-1.225, 51.732] },
];

// Each trip is a list of legs; a leg is travelled by air, sea or road through the places listed.
// Air legs fly the great circle between their two ends; the others follow their waypoints.
const DOVER = [1.31, 51.13], CALAIS = [1.86, 50.95], LONDON = [-0.12, 51.5], HEATHROW = [-0.45, 51.47];
const TRIPS = [
  {
    produce: "Tomatoes", place: "Almería", img: "tomatoes", from: "Almería, Spain", by: "lorry",
    legs: [
      { by: "road", path: [[-2.46, 36.84], [-3.7, 40.42], [-3.7, 42.34], [-1.79, 43.34], [-0.58, 44.84], [0.34, 46.58], [1.9, 47.9], [2.35, 48.86], [2.3, 49.89], CALAIS] },
      { by: "sea", path: [CALAIS, DOVER] },
      { by: "road", path: [DOVER, LONDON, HOME.at] },
    ],
  },
  {
    produce: "Squash", place: "Western Cape", img: "squash", from: "the Western Cape, South Africa", by: "ship",
    legs: [
      { by: "sea", path: [[18.42, -33.91], [14, -30], [4, -15], [-8, 0], [-18, 12], [-19, 22], [-14, 30], [-11, 37], [-10, 44], [-5.8, 48.2], [-2.5, 50.2], [-1.4, 50.88]] },
      { by: "road", path: [[-1.4, 50.88], [-1.32, 51.4], HOME.at] },
    ],
  },
  {
    produce: "Cut flowers", place: "Naivasha", img: "zinnia", from: "Lake Naivasha, Kenya", by: "air",
    legs: [
      { by: "road", path: [[36.43, -0.72], [36.93, -1.32]] },
      { by: "air", path: [[36.93, -1.32], HEATHROW] },
      { by: "road", path: [HEATHROW, HOME.at] },
    ],
  },
  {
    produce: "Radicchio", place: "Treviso", img: "radicchio", from: "Treviso, Italy", by: "lorry",
    legs: [
      { by: "road", path: [[12.24, 45.67], [10.99, 45.44], [9.19, 45.46], [7.32, 45.74], [6.14, 46.2], [5.04, 47.32], [4.03, 49.26], [2.78, 50.29], CALAIS] },
      { by: "sea", path: [CALAIS, DOVER] },
      { by: "road", path: [DOVER, LONDON, HOME.at] },
    ],
  },
  {
    produce: "Spring onions", place: "Mexico", img: "spring-onions", from: "Mexico", by: "air",
    legs: [
      { by: "air", path: [[-99.07, 19.44], HEATHROW] },
      { by: "road", path: [HEATHROW, HOME.at] },
    ],
  },
  {
    produce: "Peppers", place: "Westland", img: "red-pepper", from: "greenhouses in the Netherlands", by: "lorry and ferry",
    legs: [
      { by: "road", path: [[4.25, 52.0], [4.12, 51.98]] },
      { by: "sea", path: [[4.12, 51.98], [1.28, 51.94]] },
      { by: "road", path: [[1.28, 51.94], [0.9, 51.89], [-0.12, 51.6], HOME.at] },
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

const farms = FARMS.map((f) => ({ ...f, miles: Math.round(miles(f.at, HOME.at)) }));
const ours = Math.max(...farms.map((f) => f.miles));

export default {
  home: HOME,
  farms,
  ours,
  trips: TRIPS.map((t) => {
    const total = Math.round(t.legs.reduce((sum, leg) => sum + pathMiles(leg.path), 0) / 10) * 10;
    return { ...t, miles: total, times: Math.round(total / ours) };
  }),
};
