import type { ReactNode } from "react";
import { marketStoryArt } from "./marketStoryAssets";

type Props = {
  homeIcon: ReactNode;
  onHome: () => void;
  onStart: () => void;
};

const storyPanels = [
  { className: "urgent", effect: "糟糕！", lines: ["我得立刻", "出門一趟！"], image: marketStoryArt.ownerUrgent, alt: "看著懷錶、發現時間來不及的兔子老闆娘" },
  { className: "request", effect: "拜託…", lines: ["小航，可以幫我", "照顧一下攤位嗎？"], image: marketStoryArt.ownerRequest, alt: "雙手合十、誠懇拜託小航的兔子老闆娘" },
  { className: "handoff", lines: ["太好了！", "鑰匙交給你，", "攤位就拜託了！"], image: marketStoryArt.keyHandoff, alt: "兔子老闆娘把攤位鑰匙交到小航手中的近景" },
];

export function MarketStoryScreen({ homeIcon, onHome, onStart }: Props) {
  return <div className="market-story-screen" aria-label="兔子老闆娘的委託">
    <img className="market-story-background" src={marketStoryArt.background} alt="" aria-hidden="true" />
    <div className="stage-toolbar market-toolbar" aria-label="市場故事工具列">
      <button className="home-fab" type="button" aria-label="回桌面" onClick={onHome}>{homeIcon}</button>
    </div>
    <header className="market-story-title">
      <h2><img src={marketStoryArt.title} alt="市場小故事：老闆娘的緊急委託" decoding="async" fetchPriority="high" /></h2>
    </header>
    <div className="market-comic-strip">
      {storyPanels.map((panel) => <article className={`market-comic-panel market-comic-panel-${panel.className}`} key={panel.className}>
        {panel.effect && <span className="market-comic-effect" aria-hidden="true">{panel.effect}</span>}
        <img src={panel.image} alt={panel.alt} decoding="async" fetchPriority="high" />
        <p>{panel.lines.map((line) => <span key={line}>{line}</span>)}</p>
      </article>)}
    </div>
    <button className="market-story-start" type="button" onClick={onStart}>
      <span>開始顧攤</span>
    </button>
  </div>;
}
