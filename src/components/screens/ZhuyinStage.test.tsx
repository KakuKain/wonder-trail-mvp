// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { stages } from "../../data/stages";
import { zhuyinLevels } from "../../hooks/useZhuyinFlow";
import { ZhuyinStage } from "./ZhuyinStage";

const puzzle = stages.find((stage) => stage.mechanic === "zhuyin")?.zhuyinPuzzles?.[0];

function renderStage(overrides: Partial<Parameters<typeof ZhuyinStage>[0]> = {}) {
  if (!puzzle) throw new Error("Expected a zhuyin puzzle");
  return render(<ZhuyinStage
    levels={zhuyinLevels}
    completedLevels={[]}
    level={null}
    puzzle={puzzle}
    question={null}
    questionIndex={0}
    totalQuestions={3}
    selectedAnswer={null}
    answerParts={[]}
    answeredCorrectly={false}
    feedback=""
    hintVisible={false}
    homeIcon={<span>家</span>}
    hintIcon={<span>提示</span>}
    speakerIcon={<span>播放</span>}
    voiceSupported
    voiceMuted={false}
    fontReady
    onHome={() => undefined}
    onHint={() => undefined}
    onSpeak={() => undefined}
    onVoiceToggle={() => undefined}
    onLevelSelect={() => undefined}
    onLevelBack={() => undefined}
    onAnswer={() => undefined}
    onUndo={() => undefined}
    onContinue={() => undefined}
    {...overrides}
  />);
}

describe("ZhuyinStage fallbacks and mastery", () => {
  it("marks each independently completed level", () => {
    renderStage({ completedLevels: ["initial"] });
    expect(screen.getByRole("button", { name: "找開頭聲音，已完成" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "聽音選注音" })).toBeTruthy();
  });

  it("shows a parent reading cue and real zhuyin when speech and the special font are unavailable", () => {
    renderStage({
      level: "listen",
      voiceSupported: false,
      fontReady: false,
      question: {
        prompt: "聽一聽，選出你聽到的注音",
        answerParts: ["ㄆㄧㄥˊ"],
        choices: ["ㄆㄧㄥˊ", "ㄙㄨㄥ", "ㄇㄛˊ"],
        choiceCharacters: { "ㄆㄧㄥˊ": "蘋", "ㄙㄨㄥ": "松", "ㄇㄛˊ": "蘑" },
        choiceKind: "text",
      },
    });
    expect(screen.getByText(/請家長念「蘋」/)).toBeTruthy();
    expect(screen.getByText("ㄆㄧㄥˊ")).toBeTruthy();
    expect(screen.getByRole("button", { name: "播放蘋發音" }).hasAttribute("disabled")).toBe(true);
  });
});
