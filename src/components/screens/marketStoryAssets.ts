import marketKeyHandoff from "../../assets/market/customers/market-key-handoff-v1.webp";
import rabbitOwnerRequest from "../../assets/market/customers/rabbit-owner-request-v1.webp";
import rabbitOwnerUrgent from "../../assets/market/customers/rabbit-owner-urgent-v1.webp";
import marketStoryBackground from "../../assets/market/market-checkout-background-v2.webp";
import marketStoryTitle from "../../assets/market/market-story-title-v1.webp";

export const marketStoryArt = {
  background: marketStoryBackground,
  title: marketStoryTitle,
  keyHandoff: marketKeyHandoff,
  ownerRequest: rabbitOwnerRequest,
  ownerUrgent: rabbitOwnerUrgent,
};

export function preloadMarketStoryAssets() {
  if (typeof Image === "undefined") return;
  Object.values(marketStoryArt).forEach((source) => {
    const image = new Image();
    image.decoding = "async";
    image.src = source;
  });
}
