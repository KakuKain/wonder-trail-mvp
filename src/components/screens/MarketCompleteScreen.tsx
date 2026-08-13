import type { ReactNode } from "react";
import rabbitOwner from "../../assets/market/customers/rabbit-owner-complete-v6-mobile.png";
import marketStoryBackground from "../../assets/market/market-checkout-background-v2.webp";
import marketWingPart from "../../assets/reward/market-wing-part-v2.webp";

type Props = {
  acquiredPart: boolean;
  difficultyLabel: string;
  skillLabel: string;
  homeIcon: ReactNode;
  onHome: () => void;
  onReplay: () => void;
};

export function MarketCompleteScreen({ acquiredPart, difficultyLabel, skillLabel, homeIcon, onHome, onReplay }: Props) {
  return <div className="market-complete-screen" aria-label="市場打工完成">
    <img className="market-story-background" src={marketStoryBackground} alt="" aria-hidden="true" />
    <div className="stage-toolbar market-toolbar" aria-label="市場完成工具列">
      <button className="home-fab" type="button" aria-label="回桌面" onClick={onHome}>{homeIcon}</button>
    </div>
    <div className="market-complete-card">
      <img className="market-complete-owner" src={rabbitOwner} alt="開心的兔子老闆娘" />
      <div className="market-complete-copy">
        <small>{difficultyLabel}完成</small>
        <h2>{acquiredPart ? "獲得零件！" : `${difficultyLabel}徽章到手！`}</h2>
        <p>{acquiredPart ? "客人們都順利結帳了，這個金色機翼零件送給你！" : `你已經會${skillLabel}了，做得很好！`}</p>
      </div>
      {acquiredPart && <div className="market-complete-part">
        <span className="market-complete-glow" aria-hidden="true" />
        <img src={marketWingPart} alt="取得金色機翼零件" />
      </div>}
      {!acquiredPart && <div className="market-complete-badge" aria-label={`取得${difficultyLabel}徽章`}><span>✓</span><strong>{difficultyLabel}</strong></div>}
      <div className="market-complete-actions">
        <button type="button" className="market-complete-home" onClick={onHome}>{acquiredPart ? "收下零件" : "回到地圖"}</button>
        <button type="button" className="market-complete-replay" onClick={onReplay}>再幫忙一次</button>
      </div>
    </div>
  </div>;
}
