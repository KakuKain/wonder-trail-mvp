import type { ReactNode } from "react";

type Props = {
  instruction: string;
  ready: boolean;
  background: { image: string; position: string; scale: number };
  toolbar: ReactNode;
  objects: ReactNode;
  onBackgroundReady: () => void;
};

export function ForestStage({ instruction, ready, background, toolbar, objects, onBackgroundReady }: Props) {
  return <div className={`forest-stage ${ready ? "stage-ready" : "stage-loading"}`} aria-label={instruction} aria-busy={!ready}>
    <img key={background.image} className="forest-art" src={background.image} alt="" aria-hidden="true" decoding="async" fetchPriority="high" onLoad={onBackgroundReady} onError={onBackgroundReady} style={{ objectPosition: background.position, transform: `scale(${background.scale})` }} />
    {!ready && <div className="stage-loading-cover" aria-hidden="true" />}
    {ready && <>{toolbar}{objects}</>}
  </div>;
}
