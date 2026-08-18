// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { marketCustomerForRound } from "../../data/marketCustomers";
import { stages } from "../../data/stages";
import { marketAnswerOptions, marketQuestionValue } from "../../lib/market";
import type { RubySegment } from "../../types";
import { MarketStage } from "./MarketStage";

describe("MarketStage feedback", () => {
  it("shows a visible hint and a non-colour wrong-answer cue", () => {
    const puzzle = stages.find((stage) => stage.mechanic === "market")?.marketPuzzle;
    const difficulty = puzzle?.difficulties.find((item) => item.id === "beginner");
    const challenge = puzzle?.challenges.find((item) => item.difficulty === "beginner");
    if (!puzzle || !difficulty || !challenge) throw new Error("Expected beginner market data");
    const total = marketQuestionValue(challenge, difficulty.questionMode);
    const options = marketAnswerOptions(total, challenge.id);
    const wrongAnswer = options.find((value) => value !== total);
    if (wrongAnswer === undefined) throw new Error("Expected a wrong answer option");

    render(<MarketStage
      challenge={challenge}
      customer={marketCustomerForRound("beginner", 0)}
      completionWasNew={false}
      currencyIntroText=""
      currencyIntroRuby={[]}
      showCurrencyIntro={false}
      difficulties={puzzle.difficulties}
      activeDifficulty="beginner"
      completedDifficulties={[]}
      basket={Object.fromEntries(challenge.order.map((item) => [item.assetId, item.count]))}
      phase="total"
      feedback="再用手指一個一個數一次。"
      customerNumber={1}
      customerTarget={5}
      total={total}
      answerOptions={options}
      selectedTotal={wrongAnswer}
      hintVisible
      renderObjectIcon={(assetId) => <span className="object-icon">{assetId}</span>}
      renderRubyText={(segments: RubySegment[]) => segments.map((segment) => typeof segment === "string" ? segment : segment.text).join("")}
      homeIcon={<span aria-hidden="true">家</span>}
      hintIcon={<span aria-hidden="true">提示</span>}
      lockIcon={<span aria-hidden="true">鎖</span>}
      speakerIcon={<span aria-hidden="true">播放</span>}
      voiceSupported
      voiceSpeaking={false}
      voiceMuted={false}
      onHome={() => undefined}
      onHint={() => undefined}
      onSpeak={() => undefined}
      onVoiceToggle={() => undefined}
      onStoryStart={() => undefined}
      onReplay={() => undefined}
      onDifficultySelect={() => undefined}
      onItemSelect={() => undefined}
      onAnswerSelect={() => undefined}
      onContinue={() => undefined}
    />);

    expect(screen.getByRole("button", { name: "提示" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "關閉聲音" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("跟著亮光，一個一個數")).toBeTruthy();
    expect(screen.getByRole("button", { name: "播放題目" })).toBeTruthy();
    expect(screen.getByRole("button", { name: `選擇 ${wrongAnswer} 個` }).classList.contains("wrong")).toBe(true);
  });

  it("disables the customer speech button while voice is muted", () => {
    const puzzle = stages.find((stage) => stage.mechanic === "market")?.marketPuzzle;
    const challenge = puzzle?.challenges.find((item) => item.difficulty === "beginner");
    if (!puzzle || !challenge) throw new Error("Expected beginner market data");
    const total = marketQuestionValue(challenge, "number-recognition");

    const { container } = render(<MarketStage
      challenge={challenge}
      customer={marketCustomerForRound("beginner", 0)}
      completionWasNew={false}
      currencyIntroText=""
      currencyIntroRuby={[]}
      showCurrencyIntro={false}
      difficulties={puzzle.difficulties}
      activeDifficulty="beginner"
      completedDifficulties={[]}
      basket={{}}
      phase="pick"
      feedback=""
      customerNumber={1}
      customerTarget={5}
      total={total}
      answerOptions={marketAnswerOptions(total, challenge.id)}
      selectedTotal={null}
      hintVisible={false}
      renderObjectIcon={(assetId) => <span className="object-icon">{assetId}</span>}
      renderRubyText={(segments: RubySegment[]) => segments.map((segment) => typeof segment === "string" ? segment : segment.text).join("")}
      homeIcon={<span aria-hidden="true">家</span>}
      hintIcon={<span aria-hidden="true">提示</span>}
      lockIcon={<span aria-hidden="true">鎖</span>}
      speakerIcon={<span aria-hidden="true">播放</span>}
      voiceSupported
      voiceSpeaking={false}
      voiceMuted
      onHome={() => undefined}
      onHint={() => undefined}
      onSpeak={() => undefined}
      onVoiceToggle={() => undefined}
      onStoryStart={() => undefined}
      onReplay={() => undefined}
      onDifficultySelect={() => undefined}
      onItemSelect={() => undefined}
      onAnswerSelect={() => undefined}
      onContinue={() => undefined}
    />);

    const customerSpeechButton = screen.getByRole("button", { name: "聲音已關閉" });
    expect(customerSpeechButton.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "開啟聲音" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "蘋果" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "蘋果，2 貝" })).toBeNull();
    expect(container.querySelector(".market-art-basket-front")).toBeTruthy();
    expect(screen.queryByText("第 1/5 位")).toBeNull();
  });

  it("shows a manual next-level button after the correct answer", () => {
    const puzzle = stages.find((stage) => stage.mechanic === "market")?.marketPuzzle;
    const challenge = puzzle?.challenges.find((item) => item.difficulty === "beginner");
    if (!puzzle || !challenge) throw new Error("Expected beginner market data");
    const total = marketQuestionValue(challenge, "number-recognition");
    const options = marketAnswerOptions(total, challenge.id);
    const onContinue = vi.fn();

    const { container } = render(<MarketStage
      challenge={challenge}
      customer={marketCustomerForRound("beginner", 0)}
      completionWasNew={false}
      currencyIntroText=""
      currencyIntroRuby={[]}
      showCurrencyIntro={false}
      difficulties={puzzle.difficulties}
      activeDifficulty="beginner"
      completedDifficulties={[]}
      basket={Object.fromEntries(challenge.order.map((item) => [item.assetId, item.count]))}
      phase="total"
      feedback={`謝謝小航！一共有 ${total} 個，你數對了！`}
      customerNumber={1}
      customerTarget={5}
      total={total}
      answerOptions={marketAnswerOptions(total, challenge.id)}
      selectedTotal={total}
      hintVisible={false}
      renderObjectIcon={(assetId) => <span className="object-icon">{assetId}</span>}
      renderRubyText={(segments: RubySegment[]) => segments.map((segment) => typeof segment === "string" ? segment : segment.text).join("")}
      homeIcon={<span aria-hidden="true">家</span>}
      hintIcon={<span aria-hidden="true">提示</span>}
      lockIcon={<span aria-hidden="true">鎖</span>}
      speakerIcon={<span aria-hidden="true">播放</span>}
      voiceSupported
      voiceSpeaking={false}
      voiceMuted={false}
      onHome={() => undefined}
      onHint={() => undefined}
      onSpeak={() => undefined}
      onVoiceToggle={() => undefined}
      onStoryStart={() => undefined}
      onReplay={() => undefined}
      onDifficultySelect={() => undefined}
      onItemSelect={() => undefined}
      onAnswerSelect={() => undefined}
      onContinue={onContinue}
    />);

    const scoped = within(container);
    const nextButton = scoped.getByRole("button", { name: "下一位客人" });
    const answerButtons = options.map((value) => scoped.getByRole("button", { name: `選擇 ${value} 個` }));
    expect(answerButtons).toHaveLength(options.length);
    expect(container.querySelector(".market-checkout-basket-front")?.tagName).toBe("IMG");
    expect(scoped.getByRole("button", { name: `選擇 ${total} 個` }).classList.contains("correct")).toBe(true);
    expect(answerButtons.filter((button) => !button.classList.contains("correct")).every((button) => button.classList.contains("wrong") === false)).toBe(true);
    expect(answerButtons.filter((button) => !button.classList.contains("correct")).every((button) => button.hasAttribute("disabled"))).toBe(true);
    expect(nextButton.previousElementSibling?.classList.contains("market-answer-options")).toBe(true);
    fireEvent.click(nextButton);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
