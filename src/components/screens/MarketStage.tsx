import { useEffect, type CSSProperties, type ReactNode } from "react";
import { assets } from "../../data/assets";
import { isMarketDifficultyUnlocked, marketCalculationTerms, marketCounterRuby, marketItemSpeech, marketPrice, marketQuantityPrompt, marketRequiredCount, marketShelfItemIds } from "../../lib/market";
import type { MarketPhase } from "../../hooks/useGameState";
import type { MarketChallengeConfig, MarketCustomerConfig, MarketDifficultyConfig, MarketDifficultyId, RubySegment } from "../../types";
import { MarketCompleteScreen } from "./MarketCompleteScreen";
import { MarketStoryScreen } from "./MarketStoryScreen";
import marketBasketArt from "../../assets/market/market-basket-v2.webp";
import marketCheckoutBasketArt from "../../assets/market/market-basket-clean-v2.webp";
import marketBasketFrontArt from "../../assets/market/market-basket-front-v2.webp";
import marketCashRegisterArt from "../../assets/market/market-cash-register-v2.webp";
import marketCashRegisterSuccessArt from "../../assets/market/market-cash-register-success-v2.webp";
import marketCheckoutCabinetArt from "../../assets/market/market-checkout-cabinet-v2.webp";
import marketCheckoutBackground from "../../assets/market/market-checkout-background-v2.webp";
import marketPriceTagArt from "../../assets/market/market-price-tag-v2.png";
import marketSignArt from "../../assets/market/market-sign-v2.webp";
import marketStallBackground from "../../assets/market/market-stall-three-platforms-v2.webp";

const shelfPositions: Record<string, { x: number; y: number; rotation: number }> = {
  apple: { x: 24, y: 47.5, rotation: -3 }, pine_cone: { x: 50, y: 47.5, rotation: 2 }, pink_flower: { x: 76, y: 47.5, rotation: -1 }, mushroom: { x: 25, y: 65, rotation: 3 }, acorn: { x: 75, y: 65, rotation: -2 },
};

type Props = {
  challenge: MarketChallengeConfig;
  customer: MarketCustomerConfig;
  completionWasNew: boolean;
  currencyIntroText: string;
  currencyIntroRuby: RubySegment[];
  showCurrencyIntro: boolean;
  difficulties: MarketDifficultyConfig[];
  activeDifficulty: MarketDifficultyId;
  completedDifficulties: MarketDifficultyId[];
  basket: Record<string, number>;
  phase: MarketPhase;
  feedback: string;
  customerNumber: number;
  customerTarget: number;
  total: number;
  answerOptions: number[];
  selectedTotal: number | null;
  hintVisible: boolean;
  renderObjectIcon: (assetId: string, compact?: boolean) => ReactNode;
  renderRubyText: (segments: RubySegment[]) => ReactNode;
  homeIcon: ReactNode;
  hintIcon: ReactNode;
  lockIcon: ReactNode;
  speakerIcon: ReactNode;
  voiceSupported: boolean;
  voiceSpeaking: boolean;
  voiceMuted: boolean;
  onHome: () => void;
  onHint: () => void;
  onSpeak: (text: string, options?: { interrupt?: boolean }) => void;
  onVoiceToggle: () => void;
  onStoryStart: () => void;
  onReplay: () => void;
  onDifficultySelect: (difficulty: MarketDifficultyId) => void;
  onItemSelect: (assetId: string) => void;
  onAnswerSelect: (value: number) => void;
  onContinue: () => void;
};

export function MarketStage({ challenge, customer, completionWasNew, currencyIntroText, currencyIntroRuby, showCurrencyIntro, difficulties, activeDifficulty, completedDifficulties, basket, phase, feedback, customerNumber, customerTarget, total, answerOptions, selectedTotal, hintVisible, renderObjectIcon, renderRubyText, homeIcon, hintIcon, lockIcon, speakerIcon, voiceSupported, voiceSpeaking, voiceMuted, onHome, onHint, onSpeak, onVoiceToggle, onStoryStart, onReplay, onDifficultySelect, onItemSelect, onAnswerSelect, onContinue }: Props) {
  useEffect(() => {
    [marketCheckoutBackground, marketCheckoutBasketArt, marketBasketFrontArt, marketCashRegisterArt, marketCashRegisterSuccessArt, marketCheckoutCabinetArt, customer.image].forEach((source) => {
      const image = new Image();
      image.src = source;
    });
  }, [customer.image]);

  if (phase === "story") {
    return <div className="market-stage market-stage-story"><MarketStoryScreen homeIcon={homeIcon} onHome={onHome} onStart={onStoryStart} /></div>;
  }

  if (phase === "complete") {
    const completedDetails = difficulties.find((difficulty) => difficulty.id === activeDifficulty) ?? difficulties[0];
    return <div className="market-stage market-stage-complete"><MarketCompleteScreen acquiredPart={completionWasNew} difficultyLabel={completedDetails?.label ?? "市場任務"} skillLabel={completedDetails?.skillLabel ?? "完成購物與結帳"} homeIcon={homeIcon} onHome={onHome} onReplay={onReplay} /></div>;
  }

  const activeDetails = difficulties.find((difficulty) => difficulty.id === activeDifficulty) ?? difficulties[0];
  const questionMode = activeDetails?.questionMode ?? "number-recognition";
  const calculationTerms = marketCalculationTerms(challenge, questionMode);
  const isNumberRecognition = questionMode === "number-recognition";
  const usesMultiplication = questionMode === "challenge";
  const selectedBasketItems = Object.entries(basket).flatMap(([assetId, count]) => Array.from({ length: count }, (_, index) => ({ assetId, key: `${assetId}-${index}` })));
  const numberRecognitionItem = isNumberRecognition && challenge.order.length === 1 ? challenge.order[0] : undefined;
  const feedbackText = feedback || (phase === "pick" ? "先幫客人拿商品。" : isNumberRecognition ? "數數看籃子裡有幾個。" : "算算看總共幾貝。");
  const initialCheckoutPrompt = isNumberRecognition ? marketQuantityPrompt(challenge) : "算算看，這些商品總共幾貝？";
  const checkoutSpeech = isNumberRecognition
    ? initialCheckoutPrompt
    : usesMultiplication
      ? `${calculationTerms.map((term) => `${assets[term.assetId].label}，一個 ${term.price} 貝${term.count > 1 ? `，共有 ${term.count} 個` : ""}`).join("，加上")}，總共幾貝？`
      : `${calculationTerms.map((term) => `${assets[term.assetId].label} ${term.price} 貝`).join("，加上")}，總共幾貝？`;
  const checkoutFeedback = feedback === initialCheckoutPrompt ? "" : feedback;
  const roundLocked = phase === "total";
  const answerLocked = selectedTotal === total;
  const hasNextCustomer = customerNumber < customerTarget;
  const continueLabel = hasNextCustomer ? "下一位客人" : "完成顧攤";
  const successMessage = isNumberRecognition
    ? numberRecognitionItem
      ? `你數對了 ${total} ${marketItemSpeech[numberRecognitionItem.assetId]?.counter ?? "個"}${assets[numberRecognitionItem.assetId].label}`
      : `你數對了 ${total} 個商品`
    : `你算對了 ${total} 貝`;
  const difficultyControls = difficulties.map((difficulty) => {
    const unlocked = isMarketDifficultyUnlocked(difficulty, completedDifficulties);
    const active = activeDifficulty === difficulty.id;
    const completed = completedDifficulties.includes(difficulty.id);
    return <button className={`market-difficulty-button ${difficulty.id === "boss" ? "boss" : ""} ${active ? "active" : ""} ${completed ? "completed" : ""} ${roundLocked ? "round-locked" : ""}`} type="button" key={difficulty.id} onClick={() => onDifficultySelect(difficulty.id)} aria-label={`${difficulty.label}${completed ? "，已完成" : !unlocked ? "，尚未解鎖" : roundLocked ? "，請先完成本題" : ""}`} aria-current={active ? "true" : undefined} disabled={!unlocked || roundLocked}><span>{difficulty.label}</span><small>{difficulty.ageLabel}</small>{completed && <b className="market-difficulty-check" aria-hidden="true">✓</b>}{!unlocked && lockIcon}</button>;
  });

  return <div className={`market-stage market-stage-${phase} ${answerLocked ? "market-stage-correct" : ""}`} aria-label="市場打工">
    <div className="stage-toolbar market-toolbar" aria-label="市場工具列">
      <button className="home-fab" type="button" aria-label="回桌面" onClick={onHome}>{homeIcon}</button>
      <div className="stage-toolbar-actions">
        <button className={`voice-toggle-fab ${voiceMuted ? "muted" : ""}`} type="button" aria-label={voiceMuted ? "開啟聲音" : "關閉聲音"} aria-pressed={voiceMuted} onClick={onVoiceToggle} disabled={!voiceSupported}>{speakerIcon}</button>
        <button className="hint-fab" type="button" aria-label="提示" aria-pressed={hintVisible} onClick={onHint}>{hintIcon}</button>
      </div>
    </div>
    <div className="market-sky" aria-hidden="true" />
    {phase !== "pick" && <img className="market-checkout-background" src={marketCheckoutBackground} alt="" aria-hidden="true" />}
    {phase !== "pick" && <div className="market-level-board market-level-board-checkout" aria-label={`目前關卡：${activeDetails.label}`}><img className="market-art-sign" src={marketSignArt} alt="" aria-hidden="true" /><div className="market-current-level"><strong>{activeDetails.label}</strong><span>{activeDetails.ageLabel}</span></div></div>}
    {phase === "pick" ? <div className="market-order-screen market-order-screen-art">
      <img className="market-art-background" src={marketStallBackground} alt="" aria-hidden="true" />
      <div className="market-level-board"><img className="market-art-sign" src={marketSignArt} alt="" aria-hidden="true" /><div className="market-difficulty-row market-difficulty-row-art" aria-label="市場難度">{difficultyControls}</div></div>
      {showCurrencyIntro && !isNumberRecognition && <section className="market-currency-intro market-currency-intro-art" aria-label="市場貨幣說明"><button className="market-inline-audio" type="button" aria-label="播放貝殼說明" onClick={() => onSpeak(currencyIntroText)}>{speakerIcon}</button><span className="market-shell-coin" aria-hidden="true">貝</span><p>{renderRubyText(currencyIntroRuby)}</p></section>}
      <section className="market-stall market-stall-art" aria-label="商品攤位"><div className="market-shelves">{marketShelfItemIds.map((assetId) => {
        const requiredCount = marketRequiredCount(challenge, assetId); const selectedCount = basket[assetId] ?? 0; const isDone = requiredCount > 0 && selectedCount >= requiredCount; const position = shelfPositions[assetId];
        return <button className={`market-item-card market-item-art ${isNumberRecognition ? "market-item-counting" : ""} ${hintVisible && requiredCount > selectedCount ? "hinted" : ""} ${isDone ? "done" : ""}`} type="button" key={assetId} style={{ "--market-item-x": `${position.x}%`, "--market-item-y": `${position.y}%`, "--market-item-rotation": `${position.rotation}deg` } as CSSProperties} onClick={() => onItemSelect(assetId)} aria-label={isNumberRecognition ? assets[assetId].label : `${assets[assetId].label}，${marketPrice(challenge, assetId)} 貝`}>{renderObjectIcon(assetId)}<span className="market-item-label"><img src={marketPriceTagArt} alt="" aria-hidden="true" /><span className="market-item-label-copy"><strong>{assets[assetId].label}</strong>{!isNumberRecognition && <small className="market-item-price">{marketPrice(challenge, assetId)} 貝</small>}</span></span>{isDone && <b aria-hidden="true">✓</b>}</button>;
      })}</div></section>
      <section className="market-order-basket market-order-basket-art" aria-label="客人的籃子"><img src={marketBasketArt} alt="" aria-hidden="true" /><div className="market-art-basket-items" aria-live="polite">{selectedBasketItems.map((item) => <span key={item.key}>{renderObjectIcon(item.assetId, true)}</span>)}</div><img className="market-art-basket-front" src={marketBasketFrontArt} alt="" aria-hidden="true" /></section>
      <section className="market-dialogue market-customer-dialogue market-customer-dialogue-art" aria-label="客人訂單">
        <div className="market-customer-identity">
          <div className={`market-customer-avatar market-customer-${customer.id}`} role="img" aria-label={`${customer.name}的頭像`}><img src={customer.image} alt="" /></div>
          <p className="eyebrow market-customer-name">{renderRubyText([{ text: customer.name, ruby: customer.ruby }])}</p>
        </div>
        <div className="market-dialogue-copy">
          <div className="audio-heading">
            <button
              className="audio-button"
              type="button"
              aria-label={!voiceSupported ? "此裝置不支援語音" : voiceMuted ? "聲音已關閉" : "播放客人台詞"}
              onClick={() => onSpeak(challenge.requestText)}
              disabled={!voiceSupported || voiceMuted}
            >
              {speakerIcon}
            </button>
            <h2 className="market-order-heading" aria-label={challenge.requestText}>
              <span className="market-order-lead">{renderRubyText([{ text: "我要", ruby: "ㄨㄛˇ ㄧㄠˋ" }])}</span>
              <span className="market-order-items">
                {challenge.order.map((item) => <span className="market-order-chip" key={item.assetId}>
                  <b>{item.count}</b>
                  {renderRubyText([
                    { text: marketItemSpeech[item.assetId]?.counter ?? "個", ruby: marketCounterRuby[marketItemSpeech[item.assetId]?.counter ?? "個"] ?? "ㄍㄜˋ" },
                    { text: assets[item.assetId].label, ruby: marketItemSpeech[item.assetId]?.ruby ?? "" },
                  ])}
                </span>)}
              </span>
            </h2>
          </div>
          <p className="market-feedback" aria-live="polite">{feedbackText}</p>
        </div>
      </section>
    </div> : <div className={`market-checkout-screen ${answerLocked ? "market-checkout-screen-correct" : ""} ${hintVisible ? "market-checkout-screen-hinted" : ""}`}>
      {answerLocked && <div className="market-success-message" role="status" aria-live="assertive"><strong>答對了！</strong><span>{successMessage}</span></div>}
      <img className={`market-checkout-customer market-customer-${customer.id} ${answerLocked ? "market-checkout-customer-correct" : ""}`} src={customer.image} alt={`${customer.name}正在結帳`} />
      <section className="market-checkout-basket-art" aria-label="裝好的籃子"><span className="market-checkout-basket-base" style={{ backgroundImage: `url(${marketCheckoutBasketArt})` }} aria-hidden="true" /><div className="market-checkout-basket-items" aria-live="polite">{selectedBasketItems.map((item) => <span key={item.key} aria-label={`${assets[item.assetId].label}已放入`}>{renderObjectIcon(item.assetId, true)}</span>)}</div><img className="market-checkout-basket-front" src={marketBasketFrontArt} alt="" aria-hidden="true" /></section>
      <section className="market-cash-register" aria-label="收銀機答題">
        <img className="market-cash-register-art" src={answerLocked ? marketCashRegisterSuccessArt : marketCashRegisterArt} alt="" aria-hidden="true" />
        <button className={`market-register-audio ${voiceSpeaking ? "speaking" : ""}`} type="button" aria-label={!voiceSupported ? "此裝置不支援語音" : voiceMuted ? "聲音已關閉" : voiceSpeaking ? "重新播放語音" : answerLocked ? "播放稱讚語音" : "播放題目"} aria-pressed={voiceSpeaking} onClick={() => onSpeak(answerLocked ? `謝謝小航！${successMessage}` : checkoutSpeech, { interrupt: true })} disabled={!voiceSupported || voiceMuted}>{speakerIcon}</button>
        <div className={`market-register-display ${answerLocked ? "market-register-display-correct" : ""}`}>
          {answerLocked && <strong className="market-register-success-title">答對了！</strong>}
          {isNumberRecognition ? answerLocked ? <p className="market-number-success">{successMessage}</p> : <div className="market-number-question" aria-label={initialCheckoutPrompt}>{numberRecognitionItem ? <><span className="market-number-prompt">籃子裡有幾{marketItemSpeech[numberRecognitionItem.assetId]?.counter ?? "個"}</span><span className="market-number-subject">{renderObjectIcon(numberRecognitionItem.assetId, true)}<b>{assets[numberRecognitionItem.assetId].label}</b><strong aria-hidden="true">？</strong></span></> : <span className="market-number-prompt">籃子裡一共有幾個商品？</span>}</div> : <div className={`market-equation ${calculationTerms.length > 2 ? "market-equation-dense" : ""}`} aria-label="商品算式">{calculationTerms.map((term, index) => <span className="market-equation-part" key={term.key}>{index > 0 && <em aria-hidden="true">+</em>}<span>{renderObjectIcon(term.assetId, true)}<b>{assets[term.assetId].label}</b><strong>{term.price} 貝{usesMultiplication && term.count > 1 ? ` × ${term.count}` : ""}</strong></span></span>)}{!answerLocked && <span className="market-equation-result"><em aria-hidden="true">=</em><strong className="market-equation-answer">{selectedTotal ?? "?"}</strong></span>}</div>}
          {!answerLocked && <p className="market-register-feedback" aria-live="polite">{hintVisible ? (isNumberRecognition ? "跟著亮光，一個一個數" : "跟著亮光，一個一個算") : checkoutFeedback || (isNumberRecognition ? "選出正確的數字" : "選出正確的總價")}</p>}
        </div>
        <div className={`market-register-controls ${answerLocked ? "market-register-controls-correct" : ""}`}>
          <div className="market-answer-options market-register-keys">
            {answerOptions.map((value) => <button className={`market-answer-button ${selectedTotal === value ? "selected" : ""} ${selectedTotal === value && value !== total ? "wrong" : ""} ${selectedTotal === value && value === total ? "correct" : ""}`} type="button" key={value} onClick={() => onAnswerSelect(value)} aria-label={`選擇 ${value}${isNumberRecognition ? " 個" : " 貝"}`} disabled={answerLocked}><strong>{value}</strong>{!isNumberRecognition && <span>貝</span>}</button>)}
          </div>
          {answerLocked && <button className="market-next-order-button" type="button" aria-label={continueLabel} onClick={onContinue}><span>{hasNextCustomer ? "繼續" : "完成"}</span><strong>{continueLabel}</strong></button>}
        </div>
      </section>
      <img className="market-checkout-cabinet" src={marketCheckoutCabinetArt} alt="" aria-hidden="true" />
    </div>}
  </div>;
}
