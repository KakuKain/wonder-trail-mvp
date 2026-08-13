import { useState, type CSSProperties, type ReactNode } from "react";

type Chapter = {
  id: string;
  part: string;
  place: string;
  mechanic: string;
  story: string;
  className: string;
  image: string;
  position: { x: number; y: number; width: number };
  playable: boolean;
};

type Props = {
  chapters: readonly Chapter[];
  hasProgress: boolean;
  forestPartAcquired: boolean;
  marketPartAcquired: boolean;
  schoolPartAcquired?: boolean;
  mapArt: string;
  planeArt: string;
  characterArt: string;
  headline: ReactNode;
  body: ReactNode;
  replayIcon: ReactNode;
  lockIcon: ReactNode;
  lockedMessage: string;
  onMapReady: () => void;
  onReset: () => void;
  onChapterSelect: (chapterId: string, playable: boolean) => void;
};

export function MapScreen({
  chapters, hasProgress, forestPartAcquired, marketPartAcquired, schoolPartAcquired = false, mapArt, planeArt, characterArt,
  headline, body, replayIcon, lockIcon, lockedMessage, onMapReady, onReset, onChapterSelect,
}: Props) {
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [lockedChapterId, setLockedChapterId] = useState<string | null>(null);
  const lockedChapter = chapters.find((chapter) => chapter.id === lockedChapterId);

  return (
    <section className="chapter-select-screen">
      <div className="chapter-select-copy">
        <div className="island-map" aria-label="零件島地圖">
          {hasProgress && <button className="map-replay-button" type="button" onClick={() => setResetConfirmationOpen(true)} aria-label="重新開始遊戲" title="重新開始遊戲">{replayIcon}</button>}
          <div className="map-scene-frame">
            <img className="island-map-art" src={mapArt} alt="" aria-hidden="true" decoding="async" fetchPriority="high" onLoad={onMapReady} onError={onMapReady} />
            <div className="island-core">
              <img className="map-plane-hotspot" src={planeArt} alt="" aria-hidden="true" />
              {chapters.map((chapter) => {
                const partAcquired = chapter.id === "search" ? forestPartAcquired : chapter.id === "math" ? marketPartAcquired : chapter.id === "zhuyin" && schoolPartAcquired;
                return <button className={`map-node ${chapter.className} ${chapter.playable ? "map-node-playable" : "map-node-locked"} ${partAcquired ? "map-node-completed" : ""}`} key={chapter.id} type="button" style={{ "--map-x": `${chapter.position.x}%`, "--map-y": `${chapter.position.y}%`, "--map-width": `${chapter.position.width}%` } as CSSProperties} aria-label={`${chapter.place}，零件 ${chapter.part}${partAcquired ? "，已取得" : ""}，${chapter.mechanic}。${chapter.story}${chapter.playable ? "" : "，尚未開放"}`} aria-describedby={!chapter.playable && lockedChapterId === chapter.id ? "locked-chapter-message" : undefined} onClick={() => {
                  setLockedChapterId(chapter.playable ? null : chapter.id);
                  onChapterSelect(chapter.id, chapter.playable);
                }}>
                  <img className="map-hotspot-image" src={chapter.image} alt="" aria-hidden="true" />
                  <span className="part-badge">{chapter.part}</span>
                  {partAcquired && <span className="lock-badge part-status-badge" aria-hidden="true"><span>✓</span></span>}
                  {!chapter.playable && <span className="lock-badge" aria-hidden="true">{lockIcon}</span>}
                  <span className="map-node-label"><strong>{chapter.place}</strong></span>
                </button>;
              })}
            </div>
          </div>
          {lockedChapter && <div className="locked-chapter-message" id="locked-chapter-message" role="status" aria-live="polite">
            <span aria-hidden="true">🔒</span>
            <strong>{lockedChapter.place}尚未開放</strong>
            <small>{lockedMessage}</small>
          </div>}
          <div className="map-story-card">
            <div className="map-guide-character" aria-hidden="true"><img src={characterArt} alt="" /></div>
            <div className="map-story-copy">{headline}{body}</div>
          </div>
          {resetConfirmationOpen && <div className="reset-confirmation-backdrop" role="presentation">
            <section className="reset-confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-confirmation-title" aria-describedby="reset-confirmation-copy">
              <strong id="reset-confirmation-title">要重新開始嗎？</strong>
              <p id="reset-confirmation-copy">目前找到的零件、星星和市場進度都會清除。</p>
              <div className="reset-confirmation-actions">
                <button type="button" onClick={() => setResetConfirmationOpen(false)}>繼續遊玩</button>
                <button className="reset-confirmation-danger" type="button" onClick={() => { setResetConfirmationOpen(false); setLockedChapterId(null); onReset(); }}>清除進度</button>
              </div>
            </section>
          </div>}
        </div>
      </div>
    </section>
  );
}
