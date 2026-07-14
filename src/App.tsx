import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { assets } from "./data/assets";
import { assetImages } from "./data/assetImages";
import { forestBackgrounds } from "./data/backgrounds";
import { dialogue } from "./data/dialogue";
import { stages } from "./data/stages";
import { xiaohangVoicePreference } from "./data/voice";
import { pickScript, voiceScripts } from "./data/voiceScripts";
import { appendEvent, loadEvents, loadSave, resetSave, writeSave } from "./lib/storage";
import { createPlacedObjects } from "./lib/stagePlacement";
import { VoiceQueue } from "./lib/voiceEngine";
import type { AssetDefinition, GameEvent, PlacedObject, RubySegment, SaveData, StageConfig } from "./types";
import classroomHotspot from "./assets/maps/hotspots/classroom.webp";
import forestShrineHotspot from "./assets/maps/hotspots/forest-shrine.webp";
import marketHotspot from "./assets/maps/hotspots/market.webp";
import planeHotspot from "./assets/maps/hotspots/plane.webp";
import schoolHotspot from "./assets/maps/hotspots/school.webp";
import homeSeaMap from "./assets/maps/parts-island-square-ocean-v2.webp";
import collectionRewardClean from "./assets/reward/collection-reward-clean.webp";
import planePartReward from "./assets/reward/plane-part.webp";
import xiaohangFox from "./assets/xiaohang-fox.webp";

type Screen = "intro" | "stage" | "reward" | "complete";

const sessionId = `session-${Date.now()}`;
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
    playable: false,
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
    playable: false,
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

function createEvent(
  event: GameEvent["event"],
  stageId?: string,
  payload?: Record<string, unknown>
): GameEvent {
  return {
    event,
    sessionId,
    stageId,
    timestamp: Date.now(),
    payload,
  };
}

function nextStageIndex(save: SaveData) {
  const index = stages.findIndex((stage) => !save.completedStageIds.includes(stage.id));
  return index === -1 ? stages.length - 1 : index;
}

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>(() =>
    loadSave().completedStageIds.length >= stages.length ? "complete" : "intro"
  );
  const [stageIndex, setStageIndex] = useState(() => nextStageIndex(loadSave()));
  const [objects, setObjects] = useState<PlacedObject[]>(() =>
    createPlacedObjects(stages[nextStageIndex(loadSave())])
  );
  const [wrongClicks, setWrongClicks] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [reward, setReward] = useState<StageConfig["reward"] | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [events, setEvents] = useState<GameEvent[]>(() => loadEvents());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionPage, setCollectionPage] = useState(0);
  const [stageBackgroundReady, setStageBackgroundReady] = useState(false);
  const [stageBackgroundIndex, setStageBackgroundIndex] = useState(() =>
    Math.floor(Math.random() * forestBackgrounds.length)
  );
  const stageStartedAt = useRef(Date.now());
  const voiceQueue = useRef(new VoiceQueue());

  const stage = stages[stageIndex];
  const stageBackground = forestBackgrounds[stageBackgroundIndex % forestBackgrounds.length];
  const foundTargets = objects.filter((object) => object.isTarget && object.found).length;
  const totalTargets = objects.filter((object) => object.isTarget).length;
  const progress = Math.round((save.completedStageIds.length / stages.length) * 100);
  const hasProgress = save.completedStageIds.length > 0;
  const hasCompletedAdventure = save.completedStageIds.length >= stages.length;

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
  const selectedVoice = useMemo(
    () => pickXiaohangVoice(voices),
    [voices]
  );

  function speak(text: string) {
    voiceQueue.current.speak(text, { tone: "neutral", interrupt: true });
  }

  function guideStage(nextStage: StageConfig) {
    voiceQueue.current.speak(nextStage.instructionText, {
      tone: "neutral",
      delayMs: 500,
    });
  }

  function logEvent(event: GameEvent["event"], stageId?: string, payload?: Record<string, unknown>) {
    const nextEvent = createEvent(event, stageId, payload);
    appendEvent(nextEvent);
    setEvents(loadEvents());
  }

  function beginStage(index = stageIndex) {
    const nextStage = stages[index];
    const nextBackgroundIndex = Math.floor(Math.random() * forestBackgrounds.length);
    setStageIndex(index);
    setStageBackgroundReady(false);
    setStageBackgroundIndex(nextBackgroundIndex);
    setObjects(createPlacedObjects(nextStage));
    setWrongClicks(0);
    setHintsUsed(0);
    setHintVisible(false);
    setReward(null);
    setScreen("stage");
    stageStartedAt.current = Date.now();
    logEvent("stage_start", nextStage.id, { difficulty: nextStage.difficulty });
    guideStage(nextStage);
  }

  function beginAdventureFromDesk() {
    if (hasCompletedAdventure) {
      replayAdventure();
      return;
    }

    beginStage(nextStageIndex(save));
  }

  function completeStage(nextObjects: PlacedObject[]) {
    const durationMs = Date.now() - stageStartedAt.current;
    const nextReward = stage.reward;
    const completedStageIds = save.completedStageIds.includes(stage.id)
      ? save.completedStageIds
      : [...save.completedStageIds, stage.id];
    const stickers = Array.from(new Set([...save.stickers, ...nextReward.stickers]));
    const nextSave: SaveData = {
      completedStageIds,
      stickers,
      stars: save.stars + nextReward.stars,
      lastPlayedAt: new Date().toISOString(),
    };

    setObjects(nextObjects);
    setSave(nextSave);
    writeSave(nextSave);
    setReward(nextReward);
    setScreen("reward");
    voiceQueue.current.speak(pickScript(voiceScripts.reward, stageIndex), {
      tone: "positive",
      interrupt: true,
    });
    voiceQueue.current.speak("小航把寶物收進森林書。", {
      tone: "neutral",
      delayMs: 500,
    });
    logEvent("stage_finish", stage.id, {
      durationMs,
      wrongClicks,
      hintsUsed,
      difficulty: stage.difficulty,
    });
    logEvent("reward_claimed", stage.id, nextReward);
  }

  function handleObjectClick(object: PlacedObject) {
    if (screen !== "stage" || !stageBackgroundReady || object.found) return;

    if (object.isTarget) {
      const nextObjects = objects.map((item) =>
        item.instanceId === object.instanceId ? { ...item, found: true } : item
      );
      const remaining = nextObjects.filter((item) => item.isTarget && !item.found).length;

      if (remaining === 0) {
        completeStage(nextObjects);
      } else {
        setObjects(nextObjects);
        voiceQueue.current.speak(pickScript(voiceScripts.partialSuccess, foundTargets), {
          tone: "positive",
          interrupt: true,
        });
      }
      return;
    }

    const nextWrongClicks = wrongClicks + 1;
    setWrongClicks(nextWrongClicks);
    logEvent("wrong_click", stage.id, {
      clickedAssetId: object.assetId,
      targetAssetIds: (stage.targets ?? []).map((target) => target.assetId),
    });
    voiceQueue.current.speak(pickScript(voiceScripts.wrongClick, nextWrongClicks), {
      tone: "soft",
      interrupt: true,
    });

    if (nextWrongClicks >= stage.assist.maxWrongClicksBeforeHint && !hintVisible) {
      showHint();
    }
  }

  function showHint() {
    setHintVisible(true);
    setHintsUsed((value) => value + 1);
    voiceQueue.current.speak(`${voiceScripts.hintPrefix}${stage.instructionText}`, {
      tone: "neutral",
      interrupt: true,
    });
    logEvent("hint_show", stage.id, { reason: "assist" });
  }

  function continueAdventure() {
    const nextIndex = stageIndex + 1;
    if (nextIndex >= stages.length) {
      setScreen("complete");
      logEvent("session_end", undefined, {
        completedStages: save.completedStageIds.length,
        stars: save.stars,
      });
      return;
    }
    beginStage(nextIndex);
  }

  function replayAdventure() {
    resetSave();
    const freshSave = loadSave();
    setSave(freshSave);
    setEvents(loadEvents());
    beginStage(0);
    logEvent("progress_reset");
  }

  function returnToDesk() {
    voiceQueue.current.cancel();
    if (screen === "stage") {
      logEvent("stage_exit", stage.id, {
        durationMs: Date.now() - stageStartedAt.current,
        foundTargets,
        totalTargets,
      });
    }
    setHintVisible(false);
    setScreen("intro");
  }

  useEffect(() => {
    logEvent("session_start", undefined, { totalStages: stages.length });

    const onBeforeUnload = () => {
      appendEvent(
        createEvent("session_end", undefined, {
          completedStages: loadSave().completedStageIds.length,
        })
      );
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    voiceQueue.current.setVoice(selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    if (screen !== "stage") return undefined;

    const timer = window.setTimeout(() => {
      if (!hintVisible) {
        setHintVisible(true);
        setHintsUsed((value) => value + 1);
        voiceQueue.current.speak(`${voiceScripts.hintPrefix}${stage.instructionText}`, {
          tone: "neutral",
          delayMs: 500,
        });
        logEvent("hint_show", stage.id, { reason: "timer" });
      }
    }, stage.assist.hintDelayMs);

    return () => window.clearTimeout(timer);
  }, [screen, stage.id, stage.assist.hintDelayMs, stage.instructionText, hintVisible]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  return (
    <main className={`app-shell screen-${screen}`}>
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
        <span>{save.completedStageIds.length}/{stages.length}</span>
      </section>

      {screen === "intro" && (
        <section className="chapter-select-screen">
          <div className="chapter-select-copy">
            <div className="island-map" aria-label="零件島地圖">
              {hasProgress && (
                <button className="map-replay-button" type="button" onClick={replayAdventure} aria-label="再玩一次">
                  <ReplayIcon />
                </button>
              )}
              <div className="map-scene-frame">
                <img className="island-map-art" src={homeSeaMap} alt="" aria-hidden="true" />
                <div className="island-core">
                  <img className="map-plane-hotspot" src={planeHotspot} alt="" aria-hidden="true" />
                {chapters.map((chapter) => (
                  <button
                      className={`map-node ${chapter.className} ${chapter.playable ? "map-node-playable" : "map-node-locked"}`}
                    key={chapter.id}
                    type="button"
                    style={{
                      "--map-x": `${chapter.position.x}%`,
                      "--map-y": `${chapter.position.y}%`,
                      "--map-width": `${chapter.position.width}%`,
                    } as CSSProperties}
                      aria-label={`${chapter.place}，零件 ${chapter.part}，${chapter.mechanic}。${chapter.story}`}
                    onClick={() => {
                      if (chapter.playable) {
                        beginAdventureFromDesk();
                        return;
                      }
                        speak(`${chapter.place}會在下一版開放。`);
                    }}
                  >
                      <img className="map-hotspot-image" src={chapter.image} alt="" aria-hidden="true" />
                      <span className="part-badge">{chapter.part}</span>
                      {!chapter.playable && <span className="lock-badge" aria-hidden="true"><LockIcon /></span>}
                      <span className="map-node-label">
                        <strong>{chapter.place}</strong>
                    </span>
                  </button>
                ))}
                </div>
              </div>
              <div className="map-story-card">
                <div className="map-guide-character" aria-hidden="true">
                  <img src={xiaohangFox} alt="" />
                </div>
                <div className="map-story-copy">
                  <HeadingWithAudio
                    segments={dialogue.chapterSelectHeadline}
                    speakText="飛機壞掉了！先去森林找零件。"
                    onSpeak={speak}
                  />
                  <p>
                    <RubyText segments={dialogue.chapterSelectBody} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "stage" && (
        <section className="stage-layout">
          <aside className="story-panel">
            <div className="stage-guide-character" aria-hidden="true">
              <img src={xiaohangFox} alt="" />
            </div>
            <p><RubyText segments={stage.storyRuby} /></p>
            <HeadingWithAudio
              segments={stage.instructionRuby}
              speakText={stage.instructionText}
              onSpeak={speak}
            />
          </aside>

          <div
            className={`forest-stage ${stageBackgroundReady ? "stage-ready" : "stage-loading"}`}
            aria-label={stage.instructionText}
            aria-busy={!stageBackgroundReady}
          >
            <img
              key={stageBackground.image}
              className="forest-art"
              src={stageBackground.image}
              alt=""
              aria-hidden="true"
              onLoad={() => setStageBackgroundReady(true)}
              onError={() => setStageBackgroundReady(true)}
              style={{
                objectPosition: stageBackground.position,
                transform: `scale(${stageBackground.scale})`,
              }}
            />
            {!stageBackgroundReady && <div className="stage-loading-cover" aria-hidden="true" />}
            {stageBackgroundReady && (
              <>
                <div className="stage-toolbar" aria-label="關卡工具列">
                  <button className="home-fab" type="button" aria-label="回桌面" onClick={returnToDesk}>
                    <HomeIcon />
                  </button>
                  {stage.mechanic === "search" && stage.targets && stage.targetLabel && stage.targetRuby && (
                    <div className="stage-hud">
                      <div className="target-pill">
                        <ObjectIcon assetId={stage.targets[0].assetId} compact />
                        <span className="target-action">找找</span>
                        <strong>
                          <RubyText segments={[{ text: stage.targetLabel, ruby: stage.targetRuby }]} />
                        </strong>
                        <small className="count-badge">{foundTargets}/{totalTargets}</small>
                      </div>
                    </div>
                  )}
                  <button className="hint-fab" type="button" aria-label="小航提示" onClick={showHint}>
                    <LightbulbIcon />
                  </button>
                </div>
                {objects.map((object) => (
                  <SearchObject
                    key={object.instanceId}
                    object={object}
                    hinted={hintVisible && object.isTarget && !object.found}
                    onSelect={() => handleObjectClick(object)}
                  />
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {screen === "reward" && reward && (
        <section className="reward-screen collection-reward-screen">
          <img
            className="collection-reward-art"
            src={collectionRewardClean}
            alt=""
            aria-hidden="true"
          />
          <div className="collection-reward-toolbar" aria-label="獎勵頁工具列">
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
          </div>
          <div className="collection-unlock" aria-label={`收進圖鑑：${assets[reward.stickers[0] ?? stage.targets?.[0]?.assetId ?? "pine_cone"].label}`}>
            <div className="collection-unlock-glow" aria-hidden="true" />
            <ObjectIcon assetId={reward.stickers[0] ?? stage.targets?.[0]?.assetId ?? "pine_cone"} />
          </div>
          <div className="collection-reward-caption">
            <p className="eyebrow">收進圖鑑</p>
            <HeadingWithAudio
              segments={dialogue.rewardHeadline}
              speakText="成功取得寶物！"
              onSpeak={speak}
            />
            <div className="collection-reward-actions">
              <button className="collection-action-button" type="button" aria-label="回桌面" onClick={returnToDesk}>
                <HomeIcon />
              </button>
              <button
                className="collection-action-button collection-next-button"
                type="button"
                aria-label={stageIndex + 1 >= stages.length ? "查看結果" : "下一段森林路"}
                onClick={continueAdventure}
              >
                <ArrowRightIcon />
              </button>
            </div>
          </div>
          {collectionOpen && (
            <CollectionBookModal
              collectionPages={collectionPages}
              currentCollectionPage={currentCollectionPage}
              setCollectionOpen={setCollectionOpen}
              setCollectionPage={setCollectionPage}
            />
          )}
        </section>
      )}

      {screen === "complete" && (
        <section className="complete-screen">
          <img className="complete-bg-art" src={collectionRewardClean} alt="" aria-hidden="true" />
          <div className="collection-reward-toolbar complete-toolbar" aria-label="完成頁工具列">
            <button className="collection-round-button complete-home-button" type="button" aria-label="回島嶼" onClick={returnToDesk}>
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
          </div>
          <div className="complete-part-reward" aria-label="取得飛機零件">
            <span className="complete-part-glow" aria-hidden="true" />
            <img src={planePartReward} alt="" aria-hidden="true" />
          </div>
          <div className="complete-caption">
            <div>
              <HeadingWithAudio
                segments={dialogue.completeHeadline}
                speakText="今天的森林書完成囉！"
                onSpeak={speak}
              />
              <p>
                <RubyText segments={dialogue.completeSummary()} />
              </p>
            </div>
          </div>
          {collectionOpen && (
            <CollectionBookModal
              collectionPages={collectionPages}
              currentCollectionPage={currentCollectionPage}
              setCollectionOpen={setCollectionOpen}
              setCollectionPage={setCollectionPage}
            />
          )}
        </section>
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

function CollectionBookModal({
  collectionPages,
  currentCollectionPage,
  setCollectionOpen,
  setCollectionPage,
}: {
  collectionPages: AssetDefinition[][];
  currentCollectionPage: number;
  setCollectionOpen: Dispatch<SetStateAction<boolean>>;
  setCollectionPage: Dispatch<SetStateAction<number>>;
}) {
  return (
    <div className="collection-modal-backdrop" role="dialog" aria-modal="true" aria-label="森林圖鑑">
      <div className="collection-book-modal">
        <div className="collection-book-cover-shadow" aria-hidden="true" />
        <button
          className="collection-close-button"
          type="button"
          aria-label="關閉圖鑑"
          onClick={() => setCollectionOpen(false)}
        >
          ×
        </button>
        <div className="collection-book-title">
          <BookIcon />
          <span>森林圖鑑</span>
        </div>
        <div className="collection-book-pages">
          {Array.from({ length: 4 }).map((_, index) => {
            const asset = collectionPages[currentCollectionPage][index];

            return (
              <div className={`collection-slot ${asset ? "collected" : "locked"}`} key={asset?.id ?? `empty-${index}`}>
                {asset ? (
                  <div className="collection-sticker-card">
                    <span className="collection-tape tape-left" aria-hidden="true" />
                    <span className="collection-tape tape-right" aria-hidden="true" />
                    <ObjectIcon assetId={asset.id} />
                    <span>{asset.label}</span>
                  </div>
                ) : (
                  <div className="collection-locked-card" aria-label="還沒發現">
                    <span className="collection-empty-mark">?</span>
                    <small>未發現</small>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="collection-page-controls">
          <button
            className="collection-page-button prev"
            type="button"
            aria-label="上一頁"
            disabled={currentCollectionPage === 0}
            onClick={() => setCollectionPage((page) => Math.max(0, page - 1))}
          >
            <ArrowRightIcon />
          </button>
          <span className="collection-page-tab">{currentCollectionPage + 1}/{collectionPages.length}</span>
          <button
            className="collection-page-button"
            type="button"
            aria-label="下一頁"
            disabled={currentCollectionPage >= collectionPages.length - 1}
            onClick={() => setCollectionPage((page) => Math.min(collectionPages.length - 1, page + 1))}
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>
    </div>
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

function pickXiaohangVoice(voices: SpeechSynthesisVoice[]) {
  const preferredNames = xiaohangVoicePreference.preferredNames.map((name) => name.toLowerCase());
  const preferredKeywords = xiaohangVoicePreference.preferredKeywords.map((keyword) =>
    keyword.toLowerCase()
  );
  const chineseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("zh"));

  return (
    chineseVoices.find((voice) => {
      const haystack = `${voice.name} ${voice.lang}`.toLowerCase();
      return preferredNames.some((name) => haystack.includes(name));
    }) ??
    chineseVoices.find((voice) => {
      const haystack = `${voice.name} ${voice.lang}`.toLowerCase();
      return preferredKeywords.some((keyword) => haystack.includes(keyword));
    }) ??
    chineseVoices[0] ??
    voices[0]
  );
}

function HeadingWithAudio({
  segments,
  speakText,
  onSpeak,
}: {
  segments: RubySegment[];
  speakText: string;
  onSpeak: (text: string) => void;
}) {
  return (
    <div className="audio-heading">
      <button
        className="audio-button"
        type="button"
        aria-label="播放題目"
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
      {segments.map((segment, index) =>
        typeof segment === "string" ? (
          <span className="plain-text" key={`${segment}-${index}`}>{segment}</span>
        ) : (
          <span className="plain-text" key={`${segment.text}-${index}`}>{segment.text}</span>
        )
      )}
    </span>
  );
}

function SearchObject({
  object,
  hinted,
  onSelect,
}: {
  object: PlacedObject;
  hinted: boolean;
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
  } as CSSProperties;

  return (
    <button
      className={`search-object ${asset.kind} ${object.found ? "found" : ""} ${hinted ? "hinted" : ""}`}
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

  if (imageSrc) {
    return (
      <img
        className={`object-icon object-image ${compact ? "object-icon-compact" : ""} icon-${asset.kind}`}
        src={imageSrc}
        alt=""
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={`object-icon object-image-missing ${compact ? "object-icon-compact" : ""} icon-${asset.kind}`}
      aria-hidden="true"
    />
  );
}
