import type { ReactNode } from "react";
import type { RubySegment, ZhuyinPuzzleConfig } from "../../types";

type Props = {
  puzzle: ZhuyinPuzzleConfig;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  feedback: string;
  hintVisible: boolean;
  renderObjectIcon: (assetId: string) => ReactNode;
  renderRubyText: (segments: RubySegment[]) => ReactNode;
  homeIcon: ReactNode;
  hintIcon: ReactNode;
  speakerIcon: ReactNode;
  voiceSupported: boolean;
  voiceMuted: boolean;
  onHome: () => void;
  onHint: () => void;
  onSpeak: (text: string, options?: { interrupt?: boolean }) => void;
  onVoiceToggle: () => void;
  onAnswer: (value: string) => void;
  onContinue: () => void;
};

export function ZhuyinStage({
  puzzle, questionIndex, totalQuestions, selectedAnswer, feedback, hintVisible,
  renderObjectIcon, renderRubyText, homeIcon, hintIcon, speakerIcon,
  voiceSupported, voiceMuted, onHome, onHint, onSpeak, onVoiceToggle, onAnswer, onContinue,
}: Props) {
  const correctAnswer = puzzle.answer[0];
  const answeredCorrectly = selectedAnswer === correctAnswer;
  const visibleChoices = answeredCorrectly ? [correctAnswer] : puzzle.choices;
  return <div className={`zhuyin-stage ${answeredCorrectly ? "zhuyin-stage-correct" : ""}`} aria-label="學校拼注音">
    <div className="stage-toolbar zhuyin-toolbar" aria-label="學校工具列">
      <button className="home-fab" type="button" aria-label="回桌面" onClick={onHome}>{homeIcon}</button>
      <div className="stage-toolbar-actions">
        <button className={`voice-toggle-fab ${voiceMuted ? "muted" : ""}`} type="button" aria-label={voiceMuted ? "開啟聲音" : "關閉聲音"} aria-pressed={voiceMuted} onClick={onVoiceToggle} disabled={!voiceSupported}>{speakerIcon}</button>
        <button className="hint-fab" type="button" aria-label="小航提示" aria-pressed={hintVisible} onClick={onHint}>{hintIcon}</button>
      </div>
    </div>

    <header className="zhuyin-header">
      <p className="eyebrow">學校聲音書</p>
      <h2>幫老師找出第一個音</h2>
      <div className="zhuyin-progress" aria-label={`第 ${questionIndex + 1} 題，共 ${totalQuestions} 題`}>
        <span className="zhuyin-progress-track"><span style={{ width: `${((questionIndex + 1) / Math.max(1, totalQuestions)) * 100}%` }} /></span>
        <strong>{questionIndex + 1}/{totalQuestions}</strong>
      </div>
    </header>

    <section className="zhuyin-card" aria-labelledby="zhuyin-prompt">
      <div className="zhuyin-picture-wrap">
        <div className="zhuyin-picture" aria-label={`${puzzle.word}圖片`}>{renderObjectIcon(puzzle.imageAssetId)}</div>
        <button className="zhuyin-audio-button" type="button" aria-label={voiceMuted ? "聲音已關閉" : `播放${puzzle.word}發音`} onClick={() => onSpeak(puzzle.word, { interrupt: true })} disabled={!voiceSupported || voiceMuted}>{speakerIcon}<span>聽一聽</span></button>
      </div>
      <div className="zhuyin-word-block">
        <p className="zhuyin-helper">看圖片、聽發音</p>
        <h3 id="zhuyin-prompt">{renderRubyText([{ text: puzzle.word, ruby: puzzle.wordRuby }])}</h3>
        <p className="zhuyin-question">第一個音是什麼？</p>
      </div>
      <div className="zhuyin-choice-grid" role="group" aria-label="注音選項">
        {visibleChoices.map((choice) => <button className={`zhuyin-choice-button ${selectedAnswer === choice && choice !== correctAnswer ? "wrong" : ""} ${answeredCorrectly && choice === correctAnswer ? "correct" : ""}`} type="button" key={choice} onClick={() => onAnswer(choice)} aria-label={`選擇 ${choice}`} aria-pressed={selectedAnswer === choice}>{choice}</button>)}
      </div>
      <p className={`zhuyin-feedback ${answeredCorrectly ? "success" : selectedAnswer ? "retry" : ""}`} role="status" aria-live="polite">{feedback || "選一個你聽到的聲音"}</p>
      {answeredCorrectly && <button className="zhuyin-next-button" type="button" onClick={onContinue}><span>{questionIndex + 1 < totalQuestions ? "下一題" : "完成學校任務"}</span><span aria-hidden="true">→</span></button>}
    </section>
  </div>;
}
