import type { CSSProperties, ReactNode } from "react";
import { assets } from "../../data/assets";
import { isMarketDifficultyUnlocked, marketCalculationLines, marketPrice, marketRequiredCount, marketShelfItemIds } from "../../lib/market";
import type { MarketPhase } from "../../hooks/useGameState";
import type { MarketChallengeConfig, MarketDifficultyConfig, MarketDifficultyId, RubySegment } from "../../types";
import marketBasketArt from "../../assets/market/market-basket-v1.webp";
import marketPriceTagArt from "../../assets/market/market-price-tag-v1.png";
import marketSignArt from "../../assets/market/market-sign-v1.webp";
import marketStallBackground from "../../assets/market/market-stall-empty-wide-v6.webp";
import xiaohangFox from "../../assets/xiaohang-fox.webp";

const shelfPositions: Record<string, { x: number; y: number; rotation: number }> = {
  apple: { x: 24, y: 56.4, rotation: -3 }, pine_cone: { x: 50, y: 56.4, rotation: 2 }, pink_flower: { x: 76, y: 56.4, rotation: -1 }, mushroom: { x: 25, y: 70.5, rotation: 3 }, acorn: { x: 75, y: 70.5, rotation: -2 },
};

type Props = {
  challenge: MarketChallengeConfig;
  currencyIntroText: string;
  currencyIntroRuby: RubySegment[];
  showCurrencyIntro: boolean;
  difficulties: MarketDifficultyConfig[];
  activeDifficulty: MarketDifficultyId;
  completedDifficulties: MarketDifficultyId[];
  basket: Record<string, number>;
  phase: MarketPhase;
  feedback: string;
  total: number;
  answerOptions: number[];
  selectedTotal: number | null;
  hintVisible: boolean;
  renderObjectIcon: (assetId: string, compact?: boolean) => ReactNode;
  renderRubyText: (segments: RubySegment[]) => ReactNode;
  renderHeading: (segments: RubySegment[], text: string, audioLabel?: string) => ReactNode;
  homeIcon: ReactNode;
  hintIcon: ReactNode;
  lockIcon: ReactNode;
  speakerIcon: ReactNode;
  onHome: () => void;
  onHint: () => void;
  onSpeak: (text: string) => void;
  onDifficultySelect: (difficulty: MarketDifficultyId) => void;
  onItemSelect: (assetId: string) => void;
  onAnswerSelect: (value: number) => void;
};

export function MarketStage({ challenge, currencyIntroText, currencyIntroRuby, showCurrencyIntro, difficulties, activeDifficulty, completedDifficulties, basket, phase, feedback, total, answerOptions, selectedTotal, hintVisible, renderObjectIcon, renderRubyText, renderHeading, homeIcon, hintIcon, lockIcon, speakerIcon, onHome, onHint, onSpeak, onDifficultySelect, onItemSelect, onAnswerSelect }: Props) {
  const calculationLines = marketCalculationLines(challenge);
  const activeDetails = difficulties.find((difficulty) => difficulty.id === activeDifficulty) ?? difficulties[0];
  const isNumberRecognition = activeDetails?.questionMode === "number-recognition";
  const basketSlots = challenge.order.flatMap((item) => Array.from({ length: item.count }, (_, slotIndex) => {
    const isFilled = (basket[item.assetId] ?? 0) > slotIndex;
    return <span key={`${item.assetId}-${slotIndex}`} className={`market-basket-slot ${isFilled ? "ready" : ""}`} aria-label={`${assets[item.assetId].label}${isFilled ? "已放入" : "等待放入"}`}>{isFilled ? renderObjectIcon(item.assetId, true) : <i aria-hidden="true" />}</span>;
  }));
  const selectedBasketItems = Object.entries(basket).flatMap(([assetId, count]) => Array.from({ length: count }, (_, index) => ({ assetId, key: `${assetId}-${index}` })));
  const feedbackText = feedback || (phase === "pick" ? "先幫客人拿商品。" : isNumberRecognition ? "數數看籃子裡有幾個。" : "算算看總共幾貝。");
  const difficultyControls = difficulties.map((difficulty) => {
    const unlocked = isMarketDifficultyUnlocked(difficulty, completedDifficulties);
    const active = activeDifficulty === difficulty.id;
    const completed = completedDifficulties.includes(difficulty.id);
    return <button className={`market-difficulty-button ${difficulty.id === "boss" ? "boss" : ""} ${active ? "active" : ""} ${completed ? "completed" : ""}`} type="button" key={difficulty.id} onClick={() => onDifficultySelect(difficulty.id)} aria-label={`${difficulty.label}${unlocked ? "" : "，尚未解鎖"}`} aria-current={active ? "true" : undefined} disabled={!unlocked}><span>{difficulty.label}</span><small>{difficulty.ageLabel}</small>{!unlocked && lockIcon}</button>;
  });

  return <div className={`market-stage market-stage-${phase}`} aria-label="市場打工">
    <div className="stage-toolbar market-toolbar" aria-label="市場工具列"><button className="home-fab" type="button" aria-label="回桌面" onClick={onHome}>{homeIcon}</button><button className="hint-fab" type="button" aria-label="小航提示" onClick={onHint}>{hintIcon}</button></div>
    {phase !== "pick" && <div className="market-difficulty-row" aria-label="市場難度">{difficultyControls}</div>}
    {activeDetails && phase !== "pick" && <div className="market-active-level" aria-live="polite"><span>現在是</span><strong>{activeDetails.label}</strong><em>{activeDetails.ageLabel} · {activeDetails.skillLabel}</em>{completedDifficulties.includes(activeDetails.id) && <b>已完成</b>}</div>}
    <div className="market-sky" aria-hidden="true" />
    {phase === "pick" ? <div className="market-order-screen market-order-screen-art">
      <img className="market-art-background" src={marketStallBackground} alt="" aria-hidden="true" />
      <div className="market-level-board"><img className="market-art-sign" src={marketSignArt} alt="" aria-hidden="true" /><div className="market-difficulty-row market-difficulty-row-art" aria-label="市場難度">{difficultyControls}</div></div>
      {showCurrencyIntro && !isNumberRecognition && <section className="market-currency-intro market-currency-intro-art" aria-label="市場貨幣說明"><button className="market-inline-audio" type="button" aria-label="播放貝殼說明" onClick={() => onSpeak(currencyIntroText)}>{speakerIcon}</button><span className="market-shell-coin" aria-hidden="true">貝</span><p>{renderRubyText(currencyIntroRuby)}</p></section>}
      <section className="market-stall market-stall-art" aria-label="商品攤位"><div className="market-shelves">{marketShelfItemIds.map((assetId) => {
        const requiredCount = marketRequiredCount(challenge, assetId); const selectedCount = basket[assetId] ?? 0; const isDone = requiredCount > 0 && selectedCount >= requiredCount; const position = shelfPositions[assetId];
        return <button className={`market-item-card market-item-art ${hintVisible && requiredCount > selectedCount ? "hinted" : ""} ${isDone ? "done" : ""}`} type="button" key={assetId} style={{ "--market-item-x": `${position.x}%`, "--market-item-y": `${position.y}%`, "--market-item-rotation": `${position.rotation}deg` } as CSSProperties} onClick={() => onItemSelect(assetId)} aria-label={isNumberRecognition ? assets[assetId].label : `${assets[assetId].label}，${marketPrice(challenge, assetId)} 貝`}>{renderObjectIcon(assetId)}<span className="market-item-label"><img src={marketPriceTagArt} alt="" aria-hidden="true" /><span className="market-item-label-copy"><strong>{assets[assetId].label}</strong>{!isNumberRecognition && <small>{marketPrice(challenge, assetId)} 貝</small>}</span></span>{isDone && <b aria-hidden="true">✓</b>}</button>;
      })}</div></section>
      <section className="market-order-basket market-order-basket-art" aria-label="客人的籃子"><img src={marketBasketArt} alt="" aria-hidden="true" /><div className="market-art-basket-items" aria-live="polite">{selectedBasketItems.map((item) => <span key={item.key}>{renderObjectIcon(item.assetId, true)}</span>)}</div></section>
      <section className="market-dialogue market-customer-dialogue market-customer-dialogue-art" aria-label="客人訂單"><div className="market-dialogue-copy"><p className="eyebrow market-customer-name">{renderRubyText([{ text: challenge.customerName, ruby: challenge.customerRuby }])}</p>{renderHeading(challenge.requestRuby, challenge.requestText, "播放客人台詞")}<p className="market-feedback" aria-live="polite">{feedbackText}</p></div></section>
    </div> : <div className="market-checkout-screen">
      <section className="market-basket market-checkout-basket" aria-label="裝好的籃子"><p>籃子裡有</p><div className="market-basket-items">{basketSlots}</div></section>
      <section className="market-answer-tray market-checkout-panel" aria-label="算總價"><p className="eyebrow">幫小航算一算</p><h2>{isNumberRecognition ? "籃子裡有幾個？" : "總共幾貝？"}</h2>{isNumberRecognition ? <div className="market-number-question" aria-label="辨認商品數量"><span>數一數</span><strong>{selectedTotal ?? "?"}</strong><span>個</span></div> : <div className="market-equation" aria-label="商品算式">{calculationLines.map((line, index) => <span className="market-equation-part" key={line.key}>{index > 0 && <em aria-hidden="true">+</em>}<span>{renderObjectIcon(line.assetId, true)}<b>{assets[line.assetId].label}</b><strong>{line.price} 貝</strong></span></span>)}<em aria-hidden="true">=</em><strong className="market-equation-answer">{selectedTotal ?? "?"}</strong></div>}<p>{isNumberRecognition ? "點一下正確的數字" : "點一下正確的總價"}</p><div className="market-answer-options">{answerOptions.map((value) => <button className={`market-answer-button ${selectedTotal === value ? "selected" : ""} ${selectedTotal === value && value !== total ? "wrong" : ""} ${selectedTotal === value && value === total ? "correct" : ""}`} type="button" key={value} onClick={() => onAnswerSelect(value)} aria-label={`選擇 ${value}${isNumberRecognition ? " 個" : " 貝"}`}><strong>{value}</strong><span>{isNumberRecognition ? "個" : "貝"}</span></button>)}</div><p className="market-feedback" aria-live="polite">{feedbackText}</p></section>
      <img className="market-cashier-fox" src={xiaohangFox} alt="" aria-hidden="true" />
    </div>}
  </div>;
}
