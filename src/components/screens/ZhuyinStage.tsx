import type { ReactNode } from "react";
import type { RubySegment, ZhuyinLevelConfig, ZhuyinLevelId, ZhuyinPuzzleConfig } from "../../types";

type Question = { prompt: string; answerParts: string[]; choices: string[]; choiceKind: "image" | "text" };
const imageChoiceLabels: Record<string, string> = { apple: "蘋果", pine_cone: "松果", mushroom: "蘑菇" };
type Props = {
  levels: ZhuyinLevelConfig[]; level: ZhuyinLevelId | null; puzzle: ZhuyinPuzzleConfig; question: Question | null;
  questionIndex: number; totalQuestions: number; selectedAnswer: string | null; answerParts: string[]; answeredCorrectly: boolean;
  feedback: string; hintVisible: boolean; renderObjectIcon: (assetId: string) => ReactNode;
  renderRubyText: (segments: RubySegment[]) => ReactNode; homeIcon: ReactNode; hintIcon: ReactNode; speakerIcon: ReactNode;
  voiceSupported: boolean; voiceMuted: boolean; onHome: () => void; onHint: () => void;
  onSpeak: (text: string, options?: { interrupt?: boolean }) => void; onVoiceToggle: () => void;
  onLevelSelect: (level: ZhuyinLevelId) => void; onLevelBack: () => void; onAnswer: (value: string) => void;
  onUndo: () => void; onContinue: () => void;
};

export function ZhuyinStage(props: Props) {
  const { levels, level, puzzle, question, questionIndex, totalQuestions, selectedAnswer, answerParts, answeredCorrectly,
    feedback, hintVisible, renderObjectIcon, renderRubyText, homeIcon, hintIcon, speakerIcon, voiceSupported, voiceMuted,
    onHome, onHint, onSpeak, onVoiceToggle, onLevelSelect, onLevelBack, onAnswer, onUndo, onContinue } = props;
  const levelInfo = levels.find((item) => item.id === level);
  return <div className={`zhuyin-stage ${answeredCorrectly ? "zhuyin-stage-correct" : ""}`} aria-label="學校拼注音">
    <div className="stage-toolbar zhuyin-toolbar" aria-label="學校工具列">
      <button className="home-fab" type="button" aria-label="回桌面" onClick={onHome}>{homeIcon}</button>
      <div className="stage-toolbar-actions">
        <button className={`voice-toggle-fab ${voiceMuted ? "muted" : ""}`} type="button" aria-label={voiceMuted ? "開啟聲音" : "關閉聲音"} aria-pressed={voiceMuted} onClick={onVoiceToggle} disabled={!voiceSupported}>{speakerIcon}</button>
        {level && <button className="hint-fab" type="button" aria-label="小航提示" aria-pressed={hintVisible} onClick={onHint}>{hintIcon}</button>}
      </div>
    </div>

    {!level || !question ? <>
      <header className="zhuyin-header level-select-header"><p className="eyebrow">學校聲音書</p><h2>今天想練習哪一種？</h2><p>每個孩子都可以從適合自己的等級開始</p></header>
      <section className="zhuyin-level-grid" aria-label="選擇學習等級">
        {levels.map((item, index) => <button key={item.id} type="button" className={`zhuyin-level-card level-${index + 1}`} onClick={() => onLevelSelect(item.id)}>
          <span className="zhuyin-level-number">第 {index + 1} 級</span><span className="zhuyin-level-icon" aria-hidden="true">{item.icon}</span>
          <strong>{item.title}</strong><span>{item.shortDescription}</span><small>{item.ageLabel}</small>
        </button>)}
      </section>
    </> : <>
      <header className="zhuyin-header">
        <button type="button" className="zhuyin-level-back" onClick={onLevelBack}>‹ 更換等級</button>
        <p className="eyebrow">{levelInfo?.title}</p><h2>{question.prompt}</h2>
        <div className="zhuyin-progress" aria-label={`第 ${questionIndex + 1} 題，共 ${totalQuestions} 題`}><span className="zhuyin-progress-track"><span style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }} /></span><strong>{questionIndex + 1}/{totalQuestions}</strong></div>
      </header>
      <section className="zhuyin-card" aria-label={question.prompt}>
        <div className="zhuyin-picture-wrap"><div className="zhuyin-picture">{renderObjectIcon(puzzle.imageAssetId)}</div>
          <button className="zhuyin-audio-button" type="button" onClick={() => onSpeak(puzzle.word, { interrupt: true })} disabled={!voiceSupported || voiceMuted}>{speakerIcon}<span>聽「{puzzle.word}」</span></button>
        </div>
        {level !== "listen" && <div className="zhuyin-word-block"><h3>{puzzle.word}</h3>{answeredCorrectly && <div className="zhuyin-reveal">{renderRubyText([{ text: puzzle.word, ruby: puzzle.wordRuby }])}</div>}</div>}
        {(level === "syllable" || level === "word") && <div className="zhuyin-build-zone" aria-label="你的拼音">
          {question.answerParts.map((_, index) => <span key={index} className={answerParts[index] ? "filled" : ""}>{answerParts[index] || "？"}</span>)}
          {answerParts.length > 0 && !answeredCorrectly && <button type="button" onClick={onUndo}>退回一格</button>}
        </div>}
        <div className={`zhuyin-choice-grid ${question.choiceKind === "image" ? "image-choices" : ""}`} role="group" aria-label="答案選項">
          {question.choices.map((choice) => <button className={`zhuyin-choice-button ${selectedAnswer === choice ? "wrong" : ""} ${answeredCorrectly && question.answerParts.includes(choice) ? "correct" : ""}`} type="button" key={choice} aria-label={question.choiceKind === "image" ? `選擇${imageChoiceLabels[choice] ?? choice}` : `選擇${choice}`} onClick={() => onAnswer(choice)} disabled={answeredCorrectly}>
            {question.choiceKind === "image" ? renderObjectIcon(choice) : choice}
          </button>)}
        </div>
        <p className={`zhuyin-feedback ${answeredCorrectly ? "success" : selectedAnswer ? "retry" : ""}`} role="status" aria-live="polite">{feedback || (level === "listen" ? "按聽一聽，再選圖片" : level === "initial" ? "選出第一個聲符" : "依序放入正確的聲音積木")}</p>
        {answeredCorrectly && <button className="zhuyin-next-button" type="button" onClick={onContinue}><span>{questionIndex + 1 < totalQuestions ? "下一題" : "完成這個等級"}</span><span aria-hidden="true">→</span></button>}
      </section>
    </>}
  </div>;
}
