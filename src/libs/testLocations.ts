export interface TestLocation {
  id: string;
  label: string;
  category: string;
  zoom: number;
  lat: number;
  lng: number;
}

export const TEST_LOCATIONS: TestLocation[] = [
  // Recreation sites
  {
    id: "squamish",
    label: "Squamish, BC",
    category: "Recreation",
    zoom: 11.5,
    lat: 49.7016,
    lng: -123.1558,
  },
  {
    id: "whistler",
    label: "Whistler, BC",
    category: "Recreation",
    zoom: 11.5,
    lat: 50.1163,
    lng: -122.9574,
  },
  {
    id: "moab",
    label: "Moab, Utah",
    category: "Recreation",
    zoom: 13,
    lat: 38.575,
    lng: -109.523,
  },
  {
    id: "yellowstone",
    label: "Yellowstone, WY",
    category: "Recreation",
    zoom: 11,
    lat: 44.461,
    lng: -110.828,
  },
  {
    id: "mount-timpanogos",
    label: "Mount Timpanogos, UT",
    category: "Recreation",
    zoom: 9.62,
    lat: 40.218,
    lng: -111.87,
  },
  {
    id: "jackson-hole",
    label: "Jackson Hole, WY",
    category: "Recreation",
    zoom: 13,
    lat: 43.587,
    lng: -110.828,
  },
  {
    id: "teton-pass",
    label: "Teton Pass, WY",
    category: "Recreation",
    zoom: 13,
    lat: 43.497,
    lng: -110.954,
  },
  {
    id: "cirque",
    label: "Cirque of the Towers, WY",
    category: "Recreation",
    zoom: 11.5,
    lat: 42.776,
    lng: -109.224,
  },

  // US Landscapes
  {
    id: "yosemite",
    label: "Yosemite Valley, CA",
    category: "US Landscapes",
    zoom: 12,
    lat: 37.746,
    lng: -119.594,
  },
  {
    id: "mount-rainier",
    label: "Mount Rainier, WA",
    category: "US Landscapes",
    zoom: 11,
    lat: 46.786,
    lng: -121.736,
  },
  {
    id: "death-valley",
    label: "Death Valley, CA",
    category: "US Landscapes",
    zoom: 10,
    lat: 36.23,
    lng: -116.767,
  },
  {
    id: "everglades",
    label: "Everglades, FL",
    category: "US Landscapes",
    zoom: 11,
    lat: 25.758,
    lng: -80.767,
  },
  {
    id: "cuyahoga-valley",
    label: "Cuyahoga Valley, OH",
    category: "US Landscapes",
    zoom: 11.5,
    lat: 41.249,
    lng: -81.553,
  },
  {
    id: "mount-washington",
    label: "Mount Washington, NH",
    category: "US Landscapes",
    zoom: 12,
    lat: 44.271,
    lng: -71.303,
  },

  // Urban
  {
    id: "central-park",
    label: "Central Park, NYC",
    category: "Urban",
    zoom: 13,
    lat: 40.782,
    lng: -73.966,
  },
  {
    id: "san-francisco",
    label: "San Francisco, CA",
    category: "Urban",
    zoom: 12,
    lat: 37.7749,
    lng: -122.4194,
  },

  // International
  {
    id: "chamonix",
    label: "Chamonix, France",
    category: "International",
    zoom: 11.5,
    lat: 45.924,
    lng: 6.869,
  },
  {
    id: "matterhorn",
    label: "Matterhorn, Switzerland",
    category: "International",
    zoom: 11.5,
    lat: 45.976,
    lng: 7.659,
  },
  {
    id: "everest",
    label: "Mount Everest, Nepal",
    category: "International",
    zoom: 10.5,
    lat: 27.988,
    lng: 86.925,
  },
  {
    id: "torres-del-paine",
    label: "Torres del Paine, Chile",
    category: "International",
    zoom: 10.5,
    lat: -50.942,
    lng: -73.407,
  },
  {
    id: "landmannalaugar",
    label: "Landmannalaugar, Iceland",
    category: "International",
    zoom: 11,
    lat: 63.983,
    lng: -19.067,
  },
  {
    id: "wadi-rum",
    label: "Wadi Rum, Jordan",
    category: "International",
    zoom: 11,
    lat: 29.576,
    lng: 35.421,
  },
];

export function groupLocationsByCategory(): Map<string, TestLocation[]> {
  const grouped = new Map<string, TestLocation[]>();
  const categoryOrder = ["Recreation", "US Landscapes", "Urban", "International"];

  categoryOrder.forEach(cat => grouped.set(cat, []));

  TEST_LOCATIONS.forEach(location => {
    if (!grouped.has(location.category)) {
      grouped.set(location.category, []);
    }
    grouped.get(location.category)!.push(location);
  });

  return new Map([...categoryOrder.map(cat => [cat, grouped.get(cat)!])].filter(([_, locs]) => locs.length > 0));
}
