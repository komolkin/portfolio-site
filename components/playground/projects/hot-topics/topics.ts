export type HotTopic = {
  id: string;
  rank: number;
  name: string;
  value: string;
  image: string;
};

export const HOT_TOPICS: HotTopic[] = [
  {
    id: "xai",
    rank: 1,
    name: "xAI",
    value: "$86K",
    image: "/playground/hot-topics/xai-bg.jpg",
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
    id: "f1",
    rank: 4,
    name: "F1",
    value: "$43K",
    image: "/playground/hot-topics/f1-bg.jpg",
  },
  {
    id: "computing",
    rank: 5,
    name: "Computing",
    value: "$38K",
    image: "/playground/hot-topics/computing-bg.jpg",
  },
];
