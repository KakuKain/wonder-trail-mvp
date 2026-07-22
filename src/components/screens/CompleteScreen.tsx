import type { ReactNode } from "react";

export function CompleteScreen({ art, toolbar, partReward, caption, modal }: { art: string; toolbar: ReactNode; partReward: ReactNode; caption: ReactNode; modal?: ReactNode }) {
  return <section className="complete-screen"><img className="complete-bg-art" src={art} alt="" aria-hidden="true" />{toolbar}{partReward}{caption}{modal}</section>;
}
