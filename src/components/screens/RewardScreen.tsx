import { useState, type ReactNode } from "react";

export function RewardScreen({ art, toolbar, unlock, caption, modal }: { art: string; toolbar: ReactNode; unlock: ReactNode; caption: ReactNode; modal?: ReactNode }) {
  const [artFailed, setArtFailed] = useState(false);
  return <section className={`reward-screen collection-reward-screen ${artFailed ? "collection-reward-screen-art-missing" : ""}`}>
    {!artFailed && <img className="collection-reward-art" src={art} alt="" aria-hidden="true" onError={() => setArtFailed(true)} />}
    {toolbar}{unlock}{caption}{modal}
  </section>;
}
