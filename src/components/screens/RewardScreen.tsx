import type { ReactNode } from "react";

export function RewardScreen({ art, toolbar, unlock, caption, modal }: { art: string; toolbar: ReactNode; unlock: ReactNode; caption: ReactNode; modal?: ReactNode }) {
  return <section className="reward-screen collection-reward-screen"><img className="collection-reward-art" src={art} alt="" aria-hidden="true" />{toolbar}{unlock}{caption}{modal}</section>;
}
