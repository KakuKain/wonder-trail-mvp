import type { ReactNode } from "react";
import rabbitOwner from "../../assets/market/customers/rabbit-owner-v1.webp";
import marketStoryBackground from "../../assets/market/market-checkout-background-v2.webp";
import marketWingPart from "../../assets/reward/market-wing-part-v1.webp";

type Props = {
  acquiredPart: boolean;
  homeIcon: ReactNode;
  onHome: () => void;
  onReplay: () => void;
};

export function MarketCompleteScreen({ acquiredPart, homeIcon, onHome, onReplay }: Props) {
  return <div className="market-complete-screen" aria-label="市場打工完成">
    <img className="market-story-background" src={marketStoryBackground} alt="" aria-hidden="true" />
    <div className="stage-toolbar market-toolbar" aria-label="市場完成工具列">
      <button className="home-fab" type="button" aria-label="回桌面" onClick={onHome}>{homeIcon}</button>
    </div>
    <div className="market-complete-card">
      <img className="market-complete-owner" src={rabbitOwner} alt="開心的兔子老闆娘" />
      <div className="market-complete-copy">
        <small>市場打工完成</small>
        <h2>{acquiredPart ? "謝謝小航！" : "又完成一次了！"}</h2>
        <p>{acquiredPart ? "客人們都順利結帳了，這個金色機翼零件送給你！" : "客人們都很開心，謝謝你再次幫忙顧攤位！"}</p>
      </div>
      {acquiredPart && <div className="market-complete-part">
        <span className="market-complete-glow" aria-hidden="true" />
        <img src={marketWingPart} alt="取得金色機翼零件" />
      </div>}
      <div className="market-complete-actions">
        <button type="button" className="market-complete-home" onClick={onHome}>{acquiredPart ? "收下零件" : "回到地圖"}</button>
        <button type="button" className="market-complete-replay" onClick={onReplay}>再幫忙一次</button>
      </div>
    </div>
  </div>;
}
