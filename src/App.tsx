import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { assets } from "./data/assets";
import { assetImages } from "./data/assetImages";
import { forestBackgrounds } from "./data/backgrounds";
import { dialogue } from "./data/dialogue";
import { stages } from "./data/stages";
import { useGameController } from "./hooks/useGameController";
import { forestRewardCopy } from "./lib/gameFlow";
import { MapScreen } from "./components/screens/MapScreen";
import { CollectionBookModal } from "./components/screens/CollectionBookModal";
import { CompleteScreen } from "./components/screens/CompleteScreen";
import { ForestStage } from "./components/screens/ForestStage";
import { MarketStage } from "./components/screens/MarketStage";
import { ZhuyinStage } from "./components/screens/ZhuyinStage";
import { preloadMarketStoryAssets } from "./components/screens/marketStoryAssets";
import { RewardScreen } from "./components/screens/RewardScreen";
import type {
  AssetDefinition,
  GameEvent,
  PlacedObject,
  RubySegment,
} from "./types";
import classroomHotspot from "./assets/maps/hotspots/classroom.webp";
import forestShrineHotspot from "./assets/maps/hotspots/forest-shrine.webp";
import marketHotspot from "./assets/maps/hotspots/market.webp";
import planeHotspot from "./assets/maps/hotspots/plane.webp";
import schoolHotspot from "./assets/maps/hotspots/school.webp";
import homeSeaMap from "./assets/maps/parts-island-square-ocean-v2.webp";
import collectionRewardClean from "./assets/reward/collection-reward-clean-v2.webp";
import planePartReward from "./assets/reward/plane-part.webp";
import xiaohangFox from "./assets/xiaohang-fox-v2.png";

const chapters = [
  {
    id: "search",
    part: "A",
    place: "森林",
    mechanic: "找東西",
    story: "祭壇想請小航幫忙找出藏起來的東西。",
    className: "forest-node",
    image: forestShrineHotspot,
    position: { x: 40.8, y: 32.1, width: 17.2 },
    playable: true,
  },
  {
    id: "math",
    part: "B",
    place: "市場",
    mechanic: "算數學",
    story: "市場阿姨想請小航幫忙算錢找客人。",
    className: "market-node",
    image: marketHotspot,
    position: { x: 60.4, y: 31.3, width: 16.8 },
    playable: true,
  },
  {
    id: "zhuyin",
    part: "C",
    place: "學校",
    mechanic: "拼注音",
    story: "老師想請小航幫忙確認詞語的注音。",
    className: "school-node",
    image: schoolHotspot,
    position: { x: 37.0, y: 55.4, width: 18.2 },
    playable: true,
  },
  {
    id: "matching",
    part: "D",
    place: "教室",
    mechanic: "圖片配對",
    story: "學生們邀請小航一起玩 5 乘 6 圖片配對比賽。",
    className: "classroom-node",
    image: classroomHotspot,
    position: { x: 61.8, y: 56.8, width: 18.6 },
    playable: false,
  },
] as const;

export function App() {
  const game = useGameController(stages.length);
  const {
    save, saveProtectionMode, screen, stageIndex, objects,
    hintVisible,
    reward, lastCompletionWasNew, eventsOpen, setEventsOpen, events,
    collectionOpen, setCollectionOpen, collectionPage, setCollectionPage,
    homeMapReady, setHomeMapReady, stageBackgroundReady, setStageBackgroundReady,
    stageBackgroundIndex, marketCompletedDifficulties,
    marketPhase, marketBasket, marketSelectedTotal, marketFeedback, speak, view, actions,
  } = game;
  const {
    puzzle: marketPuzzle,
    difficulties: marketDifficulties,
    challenge: marketChallenge,
    customer: marketCustomer,
    question: currentMarketQuestionValue,
    answerChoices: currentMarketAnswerOptions,
  } = view.market;

  const stage = stages[stageIndex];
  const rewardAssetId = reward?.stickers[0] ?? stage.targets?.[0]?.assetId ?? "pine_cone";
  const rewardPresentation = forestRewardCopy(stage.targetLabel ?? assets[rewardAssetId].label, lastCompletionWasNew);
  const stageBackground = forestBackgrounds[stageBackgroundIndex % forestBackgrounds.length];
  const foundTargets = objects.filter((object) => object.isTarget && object.found).length;
  const totalTargets = objects.filter((object) => object.isTarget).length;
  const completedStageCount = stages.filter((candidate) =>
    save.completedStageIds.includes(candidate.id)
  ).length;
  const progress = Math.round((completedStageCount / stages.length) * 100);
  const forestPartAcquired = stages
    .filter((candidate) => candidate.world === "forest")
    .every((candidate) => save.completedStageIds.includes(candidate.id));
  const marketPartAcquired = save.completedStageIds.some((stageId) =>
    stages.some((candidate) => candidate.id === stageId && candidate.world === "market")
  ) || save.marketProgress.completedDifficulties.includes("advanced");
  const schoolPartAcquired = save.completedStageIds.some((stageId) =>
    stages.some((candidate) => candidate.id === stageId && candidate.world === "school")
  );
  const hasProgress = save.completedStageIds.length > 0
    || save.marketProgress.completedChallengeIds.length > 0;
  const completedCoreParts = [forestPartAcquired, marketPartAcquired, schoolPartAcquired].filter(Boolean).length;
  const nextMapPlace = !forestPartAcquired ? "森林" : !marketPartAcquired ? "市場" : "學校";
  const mapStory = completedCoreParts === 3
    ? {
        headline: ["三個零件都找到了！"] as RubySegment[],
        body: ["教室會在後續版本開放，先挑一個喜歡的任務再玩一次吧。"] as RubySegment[],
        speech: "三個零件都找到了！教室會在後續版本開放，先挑一個喜歡的任務再玩一次吧。",
      }
    : completedCoreParts === 0
      ? {
          headline: dialogue.chapterSelectHeadline,
          body: dialogue.chapterSelectBody,
          speech: "飛機壞掉了！先去森林找零件。",
        }
      : {
          headline: [`找到 ${completedCoreParts} 個零件了！`] as RubySegment[],
          body: [`接著去${nextMapPlace}，找下一個零件吧。`] as RubySegment[],
          speech: `找到 ${completedCoreParts} 個零件了！接著去${nextMapPlace}，找下一個零件吧。`,
        };
  const lockedClassroomMessage = completedCoreParts === 3
    ? "三個任務都完成了！教室將在後續版本開放。"
    : "教室將在後續版本開放，可以先挑戰森林、市場和學校。";
  const activeZhuyinLevel = view.zhuyin.levels.find((item) => item.id === view.zhuyin.level);
  const zhuyinMasteryCopy = view.zhuyin.level === "listen" ? "你會聽字音找出完整注音了！"
    : view.zhuyin.level === "initial" ? "你會找出一個字的開頭聲音了！"
      : view.zhuyin.level === "syllable" ? "你會把聲符、韻符和聲調拼起來了！"
        : "你會依序拼出完整詞語了！";

  const stickerAssets = useMemo(
    () => save.stickers.map((stickerId) => assets[stickerId]).filter(Boolean),
    [save.stickers]
  );
  const collectionPages = useMemo<AssetDefinition[][]>(() => {
    const pages: AssetDefinition[][] = [];
    for (let index = 0; index < stickerAssets.length; index += 4) {
      pages.push(stickerAssets.slice(index, index + 4));
    }
    return pages.length ? pages : [[]];
  }, [stickerAssets]);
  const currentCollectionPage = Math.min(collectionPage, collectionPages.length - 1);
  const debugEnabled = useMemo(() => new URLSearchParams(window.location.search).has("debug"), []);
  const playtestSummary = useMemo(() => summarizeEvents(events), [events]);
  useEffect(() => {
    preloadMarketStoryAssets();
  }, []);

  useEffect(() => {
    const canPreload = screen === "reward" || (screen === "intro" && homeMapReady);
    if (!canPreload) return undefined;

    const image = new Image();
    image.decoding = "async";
    image.src = stageBackground.image;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [homeMapReady, screen, stageBackground.image]);

  return (
    <main className={`app-shell screen-${screen}`}>
      {saveProtectionMode === "future-version" && (
        <section className="save-protection-notice" role="alert">
          <div>
            <strong>進度保護模式</strong>
            <p>偵測到較新版建立的存檔。為避免覆寫原始資料，目前無法開始或儲存新進度。</p>
          </div>
          <button type="button" onClick={actions.resetProgress}>清除不相容存檔並重新開始</button>
        </section>
      )}
      <section className="topbar" aria-label="遊戲狀態">
        <div>
          <p className="eyebrow">Wonder Trail</p>
          <h1>
            <RubyText segments={dialogue.title} />
          </h1>
        </div>
      </section>

      <section className="progress-wrap" aria-label="今日進度">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>{completedStageCount}/{stages.length}</span>
      </section>

      {screen === "intro" && (
        <MapScreen
          chapters={chapters} hasProgress={hasProgress} forestPartAcquired={forestPartAcquired}
          marketPartAcquired={marketPartAcquired} schoolPartAcquired={schoolPartAcquired} mapArt={homeSeaMap} planeArt={planeHotspot}
          characterArt={xiaohangFox} replayIcon={<ReplayIcon />} lockIcon={<LockIcon />}
          lockedMessage={lockedClassroomMessage}
          onMapReady={() => setHomeMapReady(true)} onReset={actions.resetProgress}
          headline={<HeadingWithAudio segments={mapStory.headline} speakText={mapStory.speech} onSpeak={speak} />}
          body={<p><RubyText segments={mapStory.body} /></p>}
          onChapterSelect={(chapterId, playable) => {
            if (chapterId === "search") return actions.startForest();
            if (chapterId === "math" && playable) return actions.startMarket();
            if (chapterId === "zhuyin" && playable) return actions.startSchool();
            if (!playable) speak(`${chapters.find((chapter) => chapter.id === chapterId)?.place ?? "這個地方"}會在下一版開放。`);
          }}
        />
      )}

      {screen === "stage" && (
        <section className={`stage-layout ${stage.mechanic === "market" ? "market-stage-layout" : ""} ${stage.mechanic === "zhuyin" ? "zhuyin-stage-layout" : ""}`}>
          {stage.mechanic === "search" && (
            <aside className="story-panel">
              <div className="stage-guide-character" aria-hidden="true">
                <img src={xiaohangFox} alt="" />
              </div>
              <div className="story-panel-surface" aria-hidden="true" />
              <p><RubyText segments={stage.storyRuby} /></p>
              <HeadingWithAudio
                segments={stage.instructionRuby}
                speakText={stage.instructionText}
                onSpeak={speak}
              />
            </aside>
          )}

          {stage.mechanic === "search" && game.forestWrongObjectId && (
            <div className="forest-wrong-feedback" role="status" aria-live="polite">
              這不是{stage.targetLabel ?? "目標"}，再找找看。
            </div>
          )}

          {stage.mechanic === "market" && marketPuzzle && marketChallenge ? (
            <MarketStage
              challenge={marketChallenge}
              customer={marketCustomer}
              completionWasNew={lastCompletionWasNew}
              currencyIntroText={marketPuzzle.currencyIntroText}
              currencyIntroRuby={marketPuzzle.currencyIntroRuby}
              showCurrencyIntro={save.marketProgress.completedChallengeIds.length === 0}
              difficulties={marketDifficulties}
              activeDifficulty={view.market.difficulty}
              completedDifficulties={marketCompletedDifficulties}
              basket={marketBasket}
              phase={marketPhase}
              feedback={marketFeedback}
              customerNumber={view.market.customerNumber}
              customerTarget={view.market.customerTarget}
              total={currentMarketQuestionValue}
              answerOptions={currentMarketAnswerOptions}
              selectedTotal={marketSelectedTotal}
              hintVisible={hintVisible}
              renderObjectIcon={(assetId, compact) => <ObjectIcon assetId={assetId} compact={compact} />}
              renderRubyText={(segments) => <RubyText segments={segments} />}
              homeIcon={<HomeIcon />}
              hintIcon={<LightbulbIcon />}
              lockIcon={<LockIcon />}
              speakerIcon={<SpeakerIcon />}
              voiceSupported={view.voice.supported}
              voiceSpeaking={view.voice.speaking}
              voiceMuted={view.voice.muted}
              onHome={actions.returnHome}
              onHint={actions.showHint}
              onSpeak={speak}
              onVoiceToggle={actions.toggleVoice}
              onStoryStart={actions.startMarketShift}
              onReplay={actions.startMarketShift}
              onDifficultySelect={actions.selectMarketDifficulty}
              onItemSelect={actions.selectMarketItem}
              onAnswerSelect={actions.answerMarket}
              onContinue={actions.continueMarket}
            />
          ) : stage.mechanic === "zhuyin" && view.zhuyin.puzzle ? (
            <ZhuyinStage
              levels={view.zhuyin.levels}
              completedLevels={view.zhuyin.completedLevels}
              level={view.zhuyin.level}
              puzzle={view.zhuyin.puzzle}
              question={view.zhuyin.question}
              questionIndex={view.zhuyin.questionIndex}
              totalQuestions={view.zhuyin.totalQuestions}
              selectedAnswer={view.zhuyin.selectedAnswer}
              answerParts={view.zhuyin.answerParts}
              answeredCorrectly={view.zhuyin.answeredCorrectly}
              feedback={view.zhuyin.feedback}
              hintVisible={hintVisible}
              homeIcon={<HomeIcon />}
              hintIcon={<LightbulbIcon />}
              speakerIcon={<SpeakerIcon />}
              voiceSupported={view.voice.supported}
              voiceMuted={view.voice.muted}
              fontReady={view.zhuyin.fontReady}
              onHome={actions.returnHome}
              onHint={actions.showHint}
              onSpeak={speak}
              onVoiceToggle={actions.toggleVoice}
              onLevelSelect={actions.selectZhuyinLevel}
              onLevelBack={actions.returnToZhuyinLevels}
              onAnswer={actions.answerZhuyin}
              onUndo={actions.undoZhuyinPart}
              onContinue={actions.continueZhuyin}
            />
          ) : (
            <ForestStage
              instruction={stage.instructionText}
              ready={stageBackgroundReady}
              background={stageBackground}
              onBackgroundReady={() => setStageBackgroundReady(true)}
              toolbar={<div className="stage-toolbar" aria-label="關卡工具列"><button className="home-fab" type="button" aria-label="回桌面" onClick={actions.returnHome}><HomeIcon /></button>{stage.mechanic === "search" && stage.targets && stage.targetLabel && stage.targetRuby && <div className="stage-hud"><div className="target-pill"><ObjectIcon assetId={stage.targets[0].assetId} compact /><span className="target-action" aria-label={`第 ${view.forest.currentStep} 關，共 ${view.forest.totalSteps} 關`}>{view.forest.currentStep}/{view.forest.totalSteps}</span><strong><RubyText segments={[{ text: stage.targetLabel, ruby: stage.targetRuby }]} /></strong><small className="count-badge">{foundTargets}/{totalTargets}</small></div></div>}<button className="hint-fab" type="button" aria-label="小航提示" aria-pressed={hintVisible} onClick={actions.showHint}><LightbulbIcon /></button></div>}
              objects={<>{objects.map((object) => <SearchObject key={object.instanceId} object={object} hitboxScale={stage.assist.hitboxScale} hinted={hintVisible && object.isTarget && !object.found} wrong={game.forestWrongObjectId === object.instanceId} onSelect={() => actions.selectForestObject(object)} />)}</>}
            />
          )}
        </section>
      )}

      {screen === "reward" && reward && (
        <RewardScreen art={collectionRewardClean}
          toolbar={<div className="collection-reward-toolbar" aria-label="獎勵頁工具列">
            <button
              className="collection-round-button collection-book-button"
              type="button"
              aria-label="查看圖鑑"
              onClick={() => {
                setCollectionPage(0);
                setCollectionOpen(true);
              }}
            >
              <BookIcon />
            </button>
          </div>}
          unlock={<div className="collection-unlock" aria-label={rewardPresentation.collectionAria}>
            <div className="collection-unlock-glow" aria-hidden="true" />
            <ObjectIcon assetId={rewardAssetId} />
          </div>}
          caption={<div className="collection-reward-caption">
            <p className="eyebrow">{rewardPresentation.eyebrow}</p>
            <HeadingWithAudio
              segments={[rewardPresentation.headline]}
              speakText={rewardPresentation.headline}
              onSpeak={speak}
            />
            <div className="collection-reward-actions">
              <button className="collection-action-button" type="button" aria-label="回桌面" onClick={actions.returnHome}>
                <HomeIcon />
              </button>
              <button
                className="collection-action-button collection-next-button"
                type="button"
                aria-label={view.forest.hasNext ? "前往下一關" : "完成森林"}
                onClick={actions.continueForestAdventure}
              >
                <span>{view.forest.hasNext ? "前往下一關" : "完成森林"}</span>
                <ArrowRightIcon />
              </button>
            </div>
          </div>}
          modal={collectionOpen && (
            <CollectionBookModal
              collectionPages={collectionPages}
              currentPage={currentCollectionPage}
              renderObjectIcon={(assetId) => <ObjectIcon assetId={assetId} />}
              bookIcon={<BookIcon />}
              arrowIcon={<ArrowRightIcon />}
              onClose={() => setCollectionOpen(false)}
              onPreviousPage={() => setCollectionPage((page) => Math.max(0, page - 1))}
              onNextPage={() => setCollectionPage((page) => Math.min(collectionPages.length - 1, page + 1))}
            />
          )}
        />
      )}

      {screen === "complete" && (
        <CompleteScreen art={collectionRewardClean}
          toolbar={<div className="collection-reward-toolbar complete-toolbar" aria-label="完成頁工具列">
            <button className="collection-round-button complete-home-button" type="button" aria-label="回島嶼" onClick={actions.returnHome}>
              <HomeIcon />
            </button>
            <button
              className="collection-round-button collection-book-button"
              type="button"
              aria-label="查看圖鑑"
              onClick={() => {
                setCollectionPage(0);
                setCollectionOpen(true);
              }}
            >
              <BookIcon />
            </button>
          </div>}
          partReward={stage.world === "forest" && !lastCompletionWasNew ? (
            <div className="complete-replay-mark" aria-label="再次通關"><span>✓</span></div>
          ) : stage.world === "school" ? <div className="complete-school-reward" aria-label={lastCompletionWasNew ? "取得學校任務貼紙" : "再次完成學校任務"}><ObjectIcon assetId={rewardAssetId} /></div>
          : <div className="complete-part-reward" aria-label="取得金色螺旋槳零件">
            <span className="complete-part-glow" aria-hidden="true" />
            <img src={planePartReward} alt="" aria-hidden="true" />
          </div>}
          caption={<div className="complete-caption">
            <div>
              <HeadingWithAudio
                segments={stage.world === "forest" && !lastCompletionWasNew ? ["恭喜再次通關！"] : stage.world === "school" ? [`${activeZhuyinLevel?.title ?? "聲音任務"}完成！`] : dialogue.completeHeadline}
                speakText={stage.world === "forest" && !lastCompletionWasNew ? "恭喜再次通關！" : stage.world === "school" ? `${activeZhuyinLevel?.title ?? "聲音任務"}完成！${zhuyinMasteryCopy}` : "今天的森林書完成囉！"}
                onSpeak={speak}
              />
              <p><RubyText segments={stage.world === "forest" && !lastCompletionWasNew ? ["小航很開心，再一起找找看吧！"] : stage.world === "school" ? [zhuyinMasteryCopy] : dialogue.completeSummary()} /></p>
              {stage.world === "school" && (
                <button className="complete-school-next-button" type="button" onClick={actions.startSchool}>
                  {view.zhuyin.completedLevels.length < view.zhuyin.levels.length ? "繼續下一級 →" : "再選一級 →"}
                </button>
              )}
            </div>
          </div>}
          modal={collectionOpen && (
            <CollectionBookModal
              collectionPages={collectionPages}
              currentPage={currentCollectionPage}
              renderObjectIcon={(assetId) => <ObjectIcon assetId={assetId} />}
              bookIcon={<BookIcon />}
              arrowIcon={<ArrowRightIcon />}
              onClose={() => setCollectionOpen(false)}
              onPreviousPage={() => setCollectionPage((page) => Math.max(0, page - 1))}
              onNextPage={() => setCollectionPage((page) => Math.min(collectionPages.length - 1, page + 1))}
            />
          )}
        />
      )}

      {debugEnabled && (
        <section className="debug-panel">
          <button className="text-action" onClick={() => setEventsOpen((value) => !value)}>
            {eventsOpen ? "收起測試紀錄" : "查看測試紀錄"}
          </button>
          {eventsOpen && (
            <div className="event-summary">
              <div className="event-summary-grid">
                <span>完成關卡 <strong>{playtestSummary.finishedStages}</strong></span>
                <span>誤點 <strong>{playtestSummary.wrongClicks}</strong></span>
                <span>提示 <strong>{playtestSummary.hints}</strong></span>
                <span>平均秒數 <strong>{playtestSummary.averageSeconds}</strong></span>
              </div>
              <pre>{JSON.stringify(events.slice(-20), null, 2)}</pre>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function summarizeEvents(events: GameEvent[]) {
  const finished = events.filter((event) => event.event === "stage_finish");
  const totalDuration = finished.reduce((sum, event) => {
    const duration = event.payload?.durationMs;
    return sum + (typeof duration === "number" ? duration : 0);
  }, 0);

  return {
    finishedStages: finished.length,
    wrongClicks: events.filter((event) => event.event === "wrong_click").length,
    hints: events.filter((event) => event.event === "hint_show").length,
    averageSeconds: finished.length === 0 ? 0 : Math.round(totalDuration / finished.length / 1000),
  };
}

function HeadingWithAudio({
  segments,
  speakText,
  onSpeak,
  audioLabel = "播放題目",
}: {
  segments: RubySegment[];
  speakText: string;
  onSpeak: (text: string) => void;
  audioLabel?: string;
}) {
  return (
    <div className="audio-heading">
      <button
        className="audio-button"
        type="button"
        aria-label={audioLabel}
        onClick={() => onSpeak(speakText)}
      >
        <SpeakerIcon />
      </button>
      <h2>
        <RubyText segments={segments} />
      </h2>
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="speaker-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 9.5V14.5H8L13 19V5L8 9.5H4Z"
        fill="currentColor"
      />
      <path
        d="M16 8.5C17.1 9.4 17.75 10.65 17.75 12C17.75 13.35 17.1 14.6 16 15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18.75 6C20.4 7.55 21.25 9.65 21.25 12C21.25 14.35 20.4 16.45 18.75 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hint-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.5 14.5C7.25 13.45 6.5 11.9 6.5 10.2C6.5 7.1 8.95 4.75 12 4.75C15.05 4.75 17.5 7.1 17.5 10.2C17.5 11.9 16.75 13.45 15.5 14.5C14.65 15.22 14.25 15.95 14.2 17H9.8C9.75 15.95 9.35 15.22 8.5 14.5Z"
        fill="currentColor"
      />
      <path d="M9.5 19H14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.2 21H13.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 2.5V1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19.1 5.1L19.8 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.9 5.1L4.2 4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="lock-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.5 10V8.2C7.5 5.55 9.35 3.75 12 3.75C14.65 3.75 16.5 5.55 16.5 8.2V10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M6.2 9.5H17.8C18.6 9.5 19.25 10.15 19.25 10.95V18.8C19.25 19.6 18.6 20.25 17.8 20.25H6.2C5.4 20.25 4.75 19.6 4.75 18.8V10.95C4.75 10.15 5.4 9.5 6.2 9.5Z"
        fill="currentColor"
      />
      <path
        d="M12 13.3V16.1"
        stroke="#fff6d8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="home-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 11.2L12 4.8L19.5 11.2V20H14.5V14.5H9.5V20H4.5V11.2Z"
        fill="currentColor"
      />
      <path
        d="M3 12.1L12 4.4L21 12.1"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      aria-hidden="true"
      className="book-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 4.8C5 4.05 5.6 3.45 6.35 3.45H18.5V19.75H6.35C5.6 19.75 5 19.15 5 18.4V4.8Z"
        fill="currentColor"
      />
      <path
        d="M7.7 6.2H16.2"
        stroke="#fff6d8"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.05 14.35C8.35 13.15 9.25 12.35 10.25 12.35C11.25 12.35 12.15 13.15 12.45 14.35C12.75 13.15 13.65 12.35 14.65 12.35C15.65 12.35 16.55 13.15 16.85 14.35"
        stroke="#fff6d8"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M8.1 17.1H16.8"
        stroke="#fff6d8"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M18.5 3.45V19.75"
        stroke="#5a3a24"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="arrow-right-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 12H18.2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M13.2 6.4L18.8 12L13.2 17.6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg
      aria-hidden="true"
      className="replay-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.4 7.2H4.2V4"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 7.1C6.1 4.9 8.7 3.5 11.7 3.5C16.6 3.5 20.5 7.4 20.5 12.3C20.5 17.2 16.6 21.1 11.7 21.1C8.6 21.1 5.9 19.5 4.3 17.1"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RubyText({ segments }: { segments: RubySegment[] }) {
  return (
    <span className="zhuyin-text">
      {segments.map((segment, index) => {
        if (typeof segment === "string") {
          return <span className="plain-text" key={`${segment}-${index}`}>{segment}</span>;
        }
        const characters = Array.from(segment.text);
        const syllables = segment.ruby.trim().split(/\s+/).filter(Boolean);
        return <span className="bpmf-annotated-text" key={`${segment.text}-${index}`} aria-label={`${segment.text}，${segment.ruby}`}>
          {characters.map((character, characterIndex) => (
            <span className="bpmf-ruby-character" key={`${character}-${characterIndex}`} aria-hidden="true">
              <span className="bpmf-base-character">{character}</span>
              <span className="bpmf-annotation-glyph">{syllables[characterIndex] ?? ""}</span>
            </span>
          ))}
        </span>;
      })}
    </span>
  );
}

function SearchObject({
  object,
  hitboxScale,
  hinted,
  wrong,
  onSelect,
}: {
  object: PlacedObject;
  hitboxScale: number;
  hinted: boolean;
  wrong: boolean;
  onSelect: () => void;
}) {
  const asset = assets[object.assetId];
  const style = {
    left: `${object.x}%`,
    top: `${object.y}%`,
    width: object.size,
    height: object.size,
    transform: `translate(-50%, -50%) rotate(${object.rotation}deg) scaleX(${object.flipX ? -1 : 1}) scale(${object.found ? 0.7 : 1})`,
    "--object-opacity": object.opacity,
    "--object-color": asset.color,
    "--object-accent": asset.accent,
    "--hitbox-inset": `${Math.max(12, Math.round((object.size * (hitboxScale - 1)) / 2))}px`,
  } as CSSProperties;

  return (
    <button
      className={`search-object ${asset.kind} ${object.found ? "found" : ""} ${hinted ? "hinted" : ""} ${wrong ? "wrong" : ""}`}
      data-target={object.isTarget ? "true" : "false"}
      style={style}
      onClick={onSelect}
      aria-label={asset.label}
    >
      <ObjectIcon assetId={asset.id} />
    </button>
  );
}

function ObjectIcon({ assetId, compact = false }: { assetId: string; compact?: boolean }) {
  const asset = assets[assetId];
  const imageSrc = assetImages[assetId];
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [imageSrc]);

  if (imageSrc && !imageFailed) {
    return (
      <img
        className={`object-icon object-image ${compact ? "object-icon-compact" : ""} icon-${asset.kind}`}
        src={imageSrc}
        alt=""
        aria-hidden="true"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`object-icon object-image-fallback ${compact ? "object-icon-compact" : ""} icon-${asset.kind}`}
      aria-hidden="true"
    >
      {asset.emoji}
    </span>
  );
}
