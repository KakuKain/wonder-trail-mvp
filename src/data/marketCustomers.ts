import bear from "../assets/market/customers/bear-v3.webp";
import cat from "../assets/market/customers/cat-v3.webp";
import deer from "../assets/market/customers/deer-v3.webp";
import dog from "../assets/market/customers/dog-v3.webp";
import fox from "../assets/market/customers/fox-v3.webp";
import lamb from "../assets/market/customers/lamb-v3.webp";
import owl from "../assets/market/customers/owl-v3.webp";
import rabbit from "../assets/market/customers/rabbit-v3.webp";
import squirrel from "../assets/market/customers/squirrel-v3.webp";
import beaver from "../assets/market/customers/beaver-v3.webp";
import type { MarketCustomerConfig, MarketDifficultyId } from "../types";

export const marketCustomers: MarketCustomerConfig[] = [
  { id: "rabbit", name: "兔兔", ruby: "ㄊㄨˋ ㄊㄨˋ", image: rabbit, imageAlt: "開心的兔兔客人" },
  { id: "deer", name: "小鹿", ruby: "ㄒㄧㄠˇ ㄌㄨˋ", image: deer, imageAlt: "開心的小鹿客人" },
  { id: "squirrel", name: "松鼠", ruby: "ㄙㄨㄥ ㄕㄨˇ", image: squirrel, imageAlt: "開心的松鼠客人" },
  { id: "bear", name: "小熊", ruby: "ㄒㄧㄠˇ ㄒㄩㄥˊ", image: bear, imageAlt: "開心的小熊客人" },
  { id: "lamb", name: "小羊", ruby: "ㄒㄧㄠˇ ㄧㄤˊ", image: lamb, imageAlt: "開心的小羊客人" },
  { id: "cat", name: "小貓", ruby: "ㄒㄧㄠˇ ㄇㄠ", image: cat, imageAlt: "開心的小貓客人" },
  { id: "beaver", name: "河狸", ruby: "ㄏㄜˊ ㄌㄧˊ", image: beaver, imageAlt: "開心的河狸客人" },
  { id: "dog", name: "小狗", ruby: "ㄒㄧㄠˇ ㄍㄡˇ", image: dog, imageAlt: "開心的小狗客人" },
  { id: "fox", name: "狐狸阿姨", ruby: "ㄏㄨˊ ㄌㄧˊ ㄚ ㄧˊ", image: fox, imageAlt: "開心的狐狸客人" },
  { id: "owl", name: "貓頭鷹", ruby: "ㄇㄠ ㄊㄡˊ ㄧㄥ", image: owl, imageAlt: "開心的貓頭鷹客人" },
];

const customerOffsets: Record<MarketDifficultyId, number> = {
  beginner: 0,
  intermediate: 3,
  advanced: 6,
  boss: 8,
};

function customerSeed(difficulty: MarketDifficultyId, seed: number) {
  return Array.from(`${difficulty}:${Math.floor(seed)}`).reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
}

export function marketCustomerOrder(difficulty: MarketDifficultyId, seed: number) {
  const customers = [...marketCustomers];
  let state = customerSeed(difficulty, seed) ^ customerOffsets[difficulty];
  for (let index = customers.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [customers[index], customers[swapIndex]] = [customers[swapIndex], customers[index]];
  }
  return customers;
}

export function marketCustomerForRound(difficulty: MarketDifficultyId, roundIndex: number, shiftSeed = 0) {
  const customers = marketCustomerOrder(difficulty, shiftSeed);
  return customers[roundIndex % customers.length];
}
