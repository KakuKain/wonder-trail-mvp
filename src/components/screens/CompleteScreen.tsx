import { useState, type ReactNode } from "react";

export function CompleteScreen({ art, toolbar, partReward, caption, modal }: { art: string; toolbar: ReactNode; partReward: ReactNode; caption: ReactNode; modal?: ReactNode }) {
  const [artFailed, setArtFailed] = useState(false);
  return <section className={`complete-screen ${artFailed ? "complete-screen-art-missing" : ""}`}>
    {!artFailed && <img className="complete-bg-art" src={art} alt="" aria-hidden="true" onError={() => setArtFailed(true)} />}
    {toolbar}{partReward}{caption}{modal}
  </section>;
}
