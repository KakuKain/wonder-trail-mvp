import forestSearch01 from "../assets/backgrounds/forest-search-01.png";
import forestSearch02 from "../assets/backgrounds/forest-search-02.png";
import forestSearch03 from "../assets/backgrounds/forest-search-03.png";
import forestSearch04 from "../assets/backgrounds/forest-search-04.png";
import forestSearch05 from "../assets/backgrounds/forest-search-05.png";

export type StageBackground = {
  image: string;
  position: string;
  scale: number;
};

export const forestBackgrounds: StageBackground[] = [
  {
    image: forestSearch01,
    position: "center center",
    scale: 1,
  },
  {
    image: forestSearch02,
    position: "center center",
    scale: 1,
  },
  {
    image: forestSearch03,
    position: "center center",
    scale: 1,
  },
  {
    image: forestSearch04,
    position: "center center",
    scale: 1,
  },
  {
    image: forestSearch05,
    position: "center center",
    scale: 1,
  },
];
