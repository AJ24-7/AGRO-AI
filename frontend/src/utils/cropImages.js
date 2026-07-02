const DEFAULT_CROP_IMAGE = "/images/rice.jpg";
const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const IMAGE = (fileName) => `/images/${fileName}`;

const CROP_IMAGE_MAP = {
  rice: IMAGE("rice.jpg"),
  wheat: IMAGE("wheat.jpg"),
  maize: IMAGE("maize.jpg"),
  corn: IMAGE("corn.jpg"),
  cotton: IMAGE("cotton.jpg"),
  sugarcane: IMAGE("sugarcane.jpg"),
  soybean: IMAGE("soyabean.jpg"),
  soyabean: IMAGE("soyabean.jpg"),
  groundnut: IMAGE("groundnut.jpg"),
  potato: IMAGE("potato.jpg"),
  banana: IMAGE("banana.jpg"),
  barley: IMAGE("barley.jpg"),
  mustard: IMAGE("mustard.jpg"),
  linseed: IMAGE("linseeds.jpg"),
  linseeds: IMAGE("linseeds.jpg"),
  chickpea: IMAGE("chickpea.jpg"),
  bajra: IMAGE("bajra.jpg"),
  moong: IMAGE("moong.jpg"),
  coconut: IMAGE("banana.jpg"),
  pepper: IMAGE("mustard.jpg"),
  spices: IMAGE("mustard.jpg"),
  ragi: IMAGE("bajra.jpg"),
  "bengal gram": IMAGE("chickpea.jpg"),
  jute: IMAGE("pulses.jpg"),
  chilli: IMAGE("mustard.jpg"),
  "pigeon pea": IMAGE("pulses.jpg"),
  jowar: IMAGE("bajra.jpg"),
  millets: IMAGE("bajra.jpg"),
  cumin: IMAGE("mustard.jpg"),
  pulses: IMAGE("pulses.jpg")
};

const CROP_NAME_ALIASES = {
  "bengal-gram": "bengal gram",
  bengalgram: "bengal gram",
  chickpeas: "chickpea",
  "chick pea": "chickpea",
  "green gram": "moong",
  mung: "moong",
  mungbean: "moong",
  "mung beans": "moong",
  "pigeonpea": "pigeon pea",
  "pigeon-pea": "pigeon pea",
  "toor dal": "pigeon pea",
  "black gram": "pulses",
  urad: "pulses",
  "soy bean": "soyabean",
  soybeans: "soyabean",
  flaxseed: "linseeds",
};

function normalizeCropName(cropName) {
  const key = (cropName || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  return CROP_NAME_ALIASES[key] || key;
}

function resolveImageUrl(value) {
  if (!value || typeof value !== "string") return "";
  const url = value.trim();
  if (!url) return "";

  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/images/")) return url;
  if (url.startsWith("/") && API_BASE_URL) return `${API_BASE_URL}${url}`;

  return url;
}

export function getCropImageUrl(cropName, preferredImageUrl, fallback = DEFAULT_CROP_IMAGE) {
  const cropKey = normalizeCropName(cropName);
  const mappedImage = CROP_IMAGE_MAP[cropKey];
  if (mappedImage) return mappedImage;

  const directImage = resolveImageUrl(preferredImageUrl);
  if (directImage) return directImage;

  return resolveImageUrl(fallback) || DEFAULT_CROP_IMAGE;
}

export function getLocationLabel(location) {
  if (!location) return "";
  const parts = [];
  if (location.district) parts.push(location.district);
  if (location.state) parts.push(location.state);
  if (location.country) parts.push(location.country);
  return parts.join(", ");
}

export { DEFAULT_CROP_IMAGE };
