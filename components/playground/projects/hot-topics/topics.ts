export type HotTopic = {
  id: string;
  rank: number;
  name: string;
  value: string;
  image: string;
};

export const HOT_TOPICS: HotTopic[] = [
  {
    id: "lebanon",
    rank: 1,
    name: "Lebanon",
    value: "$86K",
    image: "/playground/hot-topics/lebanon-bg.jpg",
  },
  {
    id: "stocks",
    rank: 2,
    name: "Stocks",
    value: "$76K",
    image: "/playground/hot-topics/stocks-bg.jpg",
  },
  {
    id: "ufc",
    rank: 3,
    name: "UFC",
    value: "$56K",
    image: "/playground/hot-topics/ufc-bg.png",
  },
  {
    id: "airdrops",
    rank: 4,
    name: "Airdrops",
    value: "$43K",
    image: "/playground/hot-topics/airdrops-bg.jpg",
  },
  {
    id: "core-cpi",
    rank: 5,
    name: "Core CPI",
    value: "$38K",
    image: "/playground/hot-topics/core-cpi-bg.jpg",
  },
];
