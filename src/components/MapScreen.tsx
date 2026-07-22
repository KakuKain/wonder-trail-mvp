import type { CSSProperties, ReactNode } from "react";

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
  mapArt: string;
  planeArt: string;
  characterArt: string;
  headline: ReactNode;
  body: ReactNode;
  replayIcon: ReactNode;
  lockIcon: ReactNode;
  onMapReady: () => void;
  onReset: () => void;
  onChapterSelect: (chapterId: string, playable: boolean) => void;
};

export function MapScreen({
  chapters, hasProgress, forestPartAcquired, marketPartAcquired, mapArt, planeArt, characterArt,
  headline, body, replayIcon, lockIcon, onMapReady, onReset, onChapterSelect,
}: Props) {
  return (
    <section className="chapter-select-screen">
      <div className="chapter-select-copy">
        <div className="island-map" aria-label="零件島地圖">
          {hasProgress && <button className="map-replay-button" type="button" onClick={onReset} aria-label="重設全部進度" title="重設全部進度">{replayIcon}</button>}
          <div className="map-scene-frame">
            <img className="island-map-art" src={mapArt} alt="" aria-hidden="true" decoding="async" fetchPriority="high" onLoad={onMapReady} onError={onMapReady} />
            <div className="island-core">
              <img className="map-plane-hotspot" src={planeArt} alt="" aria-hidden="true" />
              {chapters.map((chapter) => {
                const partAcquired = chapter.id === "search" ? forestPartAcquired : chapter.id === "math" && marketPartAcquired;
                return <button className={`map-node ${chapter.className} ${chapter.playable ? "map-node-playable" : "map-node-locked"} ${partAcquired ? "map-node-completed" : ""}`} key={chapter.id} type="button" style={{ "--map-x": `${chapter.position.x}%`, "--map-y": `${chapter.position.y}%`, "--map-width": `${chapter.position.width}%` } as CSSProperties} aria-label={`${chapter.place}，零件 ${chapter.part}${partAcquired ? "，已取得" : ""}，${chapter.mechanic}。${chapter.story}`} onClick={() => onChapterSelect(chapter.id, chapter.playable)}>
                  <img className="map-hotspot-image" src={chapter.image} alt="" aria-hidden="true" />
                  <span className="part-badge">{chapter.part}</span>
                  {partAcquired && <span className="part-status-badge" aria-hidden="true">✓ 已取得</span>}
                  {!chapter.playable && <span className="lock-badge" aria-hidden="true">{lockIcon}</span>}
                  <span className="map-node-label"><strong>{chapter.place}</strong></span>
                </button>;
              })}
            </div>
          </div>
          <div className="map-story-card">
            <div className="map-guide-character" aria-hidden="true"><img src={characterArt} alt="" /></div>
            <div className="map-story-copy">{headline}{body}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
