export type WorldCupCountry = {
  id: string;
  label: string;
  fanColors: string;
  flagDescription: string;
};

export const DEFAULT_WORLD_CUP_COUNTRY_ID = "france";

/** All 48 nations qualified for FIFA World Cup 2026. */
export const WORLD_CUP_2026_COUNTRIES: WorldCupCountry[] = [
  {
    id: "algeria",
    label: "Algeria",
    fanColors: "green and white",
    flagDescription: "Algerian green-white-red flags with red crescent and star",
  },
  {
    id: "argentina",
    label: "Argentina",
    fanColors: "light blue and white stripes",
    flagDescription: "Argentine light blue-white flags with golden sun",
  },
  {
    id: "australia",
    label: "Australia",
    fanColors: "yellow and green",
    flagDescription: "Australian blue flags with Union Jack and Southern Cross",
  },
  {
    id: "austria",
    label: "Austria",
    fanColors: "red and white",
    flagDescription: "Austrian red-white-red flags",
  },
  {
    id: "belgium",
    label: "Belgium",
    fanColors: "red, black, and yellow",
    flagDescription: "Belgian black-yellow-red tricolor flags",
  },
  {
    id: "bosnia",
    label: "Bosnia and Herzegovina",
    fanColors: "blue and yellow",
    flagDescription: "Bosnian blue flags with yellow triangle and white stars",
  },
  {
    id: "brazil",
    label: "Brazil",
    fanColors: "yellow and green",
    flagDescription: "Brazilian yellow-green flags with blue globe",
  },
  {
    id: "cabo-verde",
    label: "Cabo Verde",
    fanColors: "blue, white, and red",
    flagDescription: "Cabo Verdean blue-white-red flags with stars",
  },
  {
    id: "canada",
    label: "Canada",
    fanColors: "red and white",
    flagDescription: "Canadian red-white flags with maple leaf",
  },
  {
    id: "colombia",
    label: "Colombia",
    fanColors: "yellow, blue, and red",
    flagDescription: "Colombian yellow-blue-red tricolor flags",
  },
  {
    id: "congo-dr",
    label: "Congo DR",
    fanColors: "blue, red, and yellow",
    flagDescription: "Congolese blue flags with red diagonal stripe and yellow star",
  },
  {
    id: "cote-divoire",
    label: "Côte d'Ivoire",
    fanColors: "orange, white, and green",
    flagDescription: "Ivorian orange-white-green tricolor flags",
  },
  {
    id: "croatia",
    label: "Croatia",
    fanColors: "red and white checkered",
    flagDescription: "Croatian red-white-blue checkered flags",
  },
  {
    id: "curacao",
    label: "Curaçao",
    fanColors: "blue and yellow",
    flagDescription: "Curaçaoan blue flags with yellow stars",
  },
  {
    id: "czechia",
    label: "Czechia",
    fanColors: "red, white, and blue",
    flagDescription: "Czech white-red flags with blue triangle",
  },
  {
    id: "ecuador",
    label: "Ecuador",
    fanColors: "yellow, blue, and red",
    flagDescription: "Ecuadorian yellow-blue-red flags with coat of arms",
  },
  {
    id: "egypt",
    label: "Egypt",
    fanColors: "red, white, and black",
    flagDescription: "Egyptian red-white-black flags with golden eagle",
  },
  {
    id: "england",
    label: "England",
    fanColors: "white with red accents",
    flagDescription: "English white flags with red St George's cross",
  },
  {
    id: "france",
    label: "France",
    fanColors: "blue, white, and red",
    flagDescription: "French blue-white-red tricolor flags",
  },
  {
    id: "germany",
    label: "Germany",
    fanColors: "white and black with red accents",
    flagDescription: "German black-red-gold tricolor flags",
  },
  {
    id: "ghana",
    label: "Ghana",
    fanColors: "red, gold, and green",
    flagDescription: "Ghanaian red-gold-green flags with black star",
  },
  {
    id: "haiti",
    label: "Haiti",
    fanColors: "blue and red",
    flagDescription: "Haitian blue-red flags with coat of arms",
  },
  {
    id: "iran",
    label: "Iran",
    fanColors: "white, green, and red",
    flagDescription: "Iranian green-white-red flags with national emblem",
  },
  {
    id: "iraq",
    label: "Iraq",
    fanColors: "white, red, and black",
    flagDescription: "Iraqi red-white-black flags with green Arabic script",
  },
  {
    id: "japan",
    label: "Japan",
    fanColors: "blue and white",
    flagDescription: "Japanese white flags with red circle",
  },
  {
    id: "jordan",
    label: "Jordan",
    fanColors: "red, black, white, and green",
    flagDescription: "Jordanian black-white-green flags with red triangle and star",
  },
  {
    id: "korea",
    label: "Korea Republic",
    fanColors: "red and blue",
    flagDescription: "South Korean white flags with red-blue yin-yang symbol",
  },
  {
    id: "mexico",
    label: "Mexico",
    fanColors: "green, white, and red",
    flagDescription: "Mexican green-white-red tricolor flags",
  },
  {
    id: "morocco",
    label: "Morocco",
    fanColors: "red and green",
    flagDescription: "Moroccan red flags with green pentagram",
  },
  {
    id: "netherlands",
    label: "Netherlands",
    fanColors: "orange",
    flagDescription: "Dutch orange flags and red-white-blue tricolors",
  },
  {
    id: "new-zealand",
    label: "New Zealand",
    fanColors: "black with white accents",
    flagDescription: "New Zealand black flags with silver fern and Union Jack",
  },
  {
    id: "norway",
    label: "Norway",
    fanColors: "red, white, and blue",
    flagDescription: "Norwegian red flags with blue cross outlined in white",
  },
  {
    id: "panama",
    label: "Panama",
    fanColors: "red, white, and blue",
    flagDescription: "Panamanian red-white-blue quartered flags",
  },
  {
    id: "paraguay",
    label: "Paraguay",
    fanColors: "red, white, and blue",
    flagDescription: "Paraguayan red-white-blue tricolor flags",
  },
  {
    id: "portugal",
    label: "Portugal",
    fanColors: "red and green",
    flagDescription: "Portuguese red-green flags with coat of arms",
  },
  {
    id: "qatar",
    label: "Qatar",
    fanColors: "maroon and white",
    flagDescription: "Qatari maroon-white serrated flags",
  },
  {
    id: "saudi-arabia",
    label: "Saudi Arabia",
    fanColors: "green and white",
    flagDescription: "Saudi green flags with white Arabic script and sword",
  },
  {
    id: "scotland",
    label: "Scotland",
    fanColors: "dark blue and white",
    flagDescription: "Scottish blue flags with white St Andrew's cross",
  },
  {
    id: "senegal",
    label: "Senegal",
    fanColors: "white, green, and red",
    flagDescription: "Senegalese green-yellow-red flags with green star",
  },
  {
    id: "south-africa",
    label: "South Africa",
    fanColors: "green and gold",
    flagDescription: "South African multicolor flags with green Y-shape",
  },
  {
    id: "spain",
    label: "Spain",
    fanColors: "red and yellow",
    flagDescription: "Spanish red-yellow-red flags",
  },
  {
    id: "sweden",
    label: "Sweden",
    fanColors: "yellow and blue",
    flagDescription: "Swedish blue flags with yellow cross",
  },
  {
    id: "switzerland",
    label: "Switzerland",
    fanColors: "red and white",
    flagDescription: "Swiss red flags with white cross",
  },
  {
    id: "tunisia",
    label: "Tunisia",
    fanColors: "red and white",
    flagDescription: "Tunisian red flags with white circle, crescent, and star",
  },
  {
    id: "turkiye",
    label: "Türkiye",
    fanColors: "red and white",
    flagDescription: "Turkish red flags with white crescent and star",
  },
  {
    id: "usa",
    label: "United States",
    fanColors: "red, white, and blue",
    flagDescription: "American stars-and-stripes flags",
  },
  {
    id: "uruguay",
    label: "Uruguay",
    fanColors: "light blue and white",
    flagDescription: "Uruguayan light blue-white striped flags with sun",
  },
  {
    id: "uzbekistan",
    label: "Uzbekistan",
    fanColors: "blue, white, and green",
    flagDescription: "Uzbek blue-white-green flags with crescent and stars",
  },
];

const countryById = new Map(WORLD_CUP_2026_COUNTRIES.map((country) => [country.id, country]));

export function getWorldCupCountry(id: string): WorldCupCountry | undefined {
  return countryById.get(id);
}

const WORLD_CUP_FLAG_CODES: Record<string, string> = {
  algeria: "dz",
  argentina: "ar",
  australia: "au",
  austria: "at",
  belgium: "be",
  bosnia: "ba",
  brazil: "br",
  "cabo-verde": "cv",
  canada: "ca",
  colombia: "co",
  "congo-dr": "cd",
  "cote-divoire": "ci",
  croatia: "hr",
  curacao: "cw",
  czechia: "cz",
  ecuador: "ec",
  egypt: "eg",
  england: "gb-eng",
  france: "fr",
  germany: "de",
  ghana: "gh",
  haiti: "ht",
  iran: "ir",
  iraq: "iq",
  japan: "jp",
  jordan: "jo",
  korea: "kr",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  "new-zealand": "nz",
  norway: "no",
  panama: "pa",
  paraguay: "py",
  portugal: "pt",
  qatar: "qa",
  "saudi-arabia": "sa",
  scotland: "gb-sct",
  senegal: "sn",
  "south-africa": "za",
  spain: "es",
  sweden: "se",
  switzerland: "ch",
  tunisia: "tn",
  turkiye: "tr",
  usa: "us",
  uruguay: "uy",
  uzbekistan: "uz",
};

export function getWorldCupFlagUrl(countryId: string) {
  const code = WORLD_CUP_FLAG_CODES[countryId] ?? countryId;
  return `https://hatscripts.github.io/circle-flags/flags/${code}.svg`;
}

export const WORLD_CUP_COUNTRY_IDS = WORLD_CUP_2026_COUNTRIES.map((country) => country.id);
