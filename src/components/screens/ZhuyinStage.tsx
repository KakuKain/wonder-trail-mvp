import { useEffect, type ReactNode } from "react";
import type { ZhuyinLevelConfig, ZhuyinLevelId, ZhuyinPuzzleConfig } from "../../types";

type Question = { prompt: string; answerParts: string[]; choices: string[]; choiceCharacters?: Record<string, string>; choiceKind: "image" | "text" };

function VerticalZhuyinWord({ word, ruby, fontReady }: { word: string; ruby: string; fontReady: boolean }) {
  const syllables = ruby.split(/\s+/).filter(Boolean);
  return <span className="vertical-zhuyin-word" aria-label={`${word}，${ruby}`}>
    {Array.from(word).map((character, index) => <span className="vertical-zhuyin-character" key={`${character}-${index}`}>
      <b aria-hidden="true">{character}</b>{fontReady
        ? <small className="bpmf-zihi-only" aria-hidden="true">{syllables[index] ?? ""}</small>
        : <small className="plain-zhuyin-fallback" aria-hidden="true">{syllables[index] ?? ""}</small>}
    </span>)}
  </span>;
}

type Props = {
  levels: ZhuyinLevelConfig[]; completedLevels: ZhuyinLevelId[]; level: ZhuyinLevelId | null; puzzle: ZhuyinPuzzleConfig; question: Question | null;
  questionIndex: number; totalQuestions: number; selectedAnswer: string | null; answerParts: string[]; answeredCorrectly: boolean;
  feedback: string; hintVisible: boolean; homeIcon: ReactNode; hintIcon: ReactNode; speakerIcon: ReactNode;
  voiceSupported: boolean; voiceMuted: boolean; fontReady: boolean; onHome: () => void; onHint: () => void;
  onSpeak: (text: string, options?: { interrupt?: boolean }) => void; onVoiceToggle: () => void;
  onLevelSelect: (level: ZhuyinLevelId) => void; onLevelBack: () => void; onAnswer: (value: string) => void;
  onUndo: () => void; onContinue: () => void;
};

export function ZhuyinStage(props: Props) {
  const { levels, completedLevels, level, puzzle, question, questionIndex, totalQuestions, selectedAnswer, answerParts, answeredCorrectly,
    feedback, hintVisible, homeIcon, hintIcon, speakerIcon, voiceSupported, voiceMuted, fontReady,
    onHome, onHint, onSpeak, onVoiceToggle, onLevelSelect, onLevelBack, onAnswer, onUndo, onContinue } = props;
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [level]);
  const levelInfo = levels.find((item) => item.id === level);
  const spokenPrompt = level === "listen" ? puzzle.word[0] : puzzle.word;
  const playPrompt = () => {
    if (voiceMuted) onVoiceToggle();
    onSpeak(spokenPrompt, { interrupt: true });
  };
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
        {levels.map((item, index) => <button key={item.id} type="button" className={`zhuyin-level-card level-${index + 1} ${completedLevels.includes(item.id) ? "completed" : ""}`} onClick={() => onLevelSelect(item.id)} aria-label={`${item.title}${completedLevels.includes(item.id) ? "，已完成" : ""}`}>
          <span className="zhuyin-level-number">第 {index + 1} 級</span><span className="zhuyin-level-icon" aria-hidden="true">{item.icon}</span>
          {completedLevels.includes(item.id) && <span className="zhuyin-level-complete" aria-hidden="true">✓</span>}
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
        <div className={`zhuyin-listen-panel ${level === "listen" ? "audio-only" : ""}`}>
          {level !== "listen" && <p>聽一聽，再完成下面的任務</p>}
          <button className="zhuyin-audio-button" type="button" aria-label={`${voiceMuted ? "開啟聲音並" : ""}播放${spokenPrompt}發音`} onClick={playPrompt} disabled={!voiceSupported}>{speakerIcon}<span>{voiceMuted ? "開啟聲音並播放" : level === "listen" ? "播放字音" : "播放題目"}</span></button>
          {!voiceSupported && <p className="zhuyin-voice-fallback" role="status">這台裝置沒有語音，請家長念「{spokenPrompt}」給孩子聽。</p>}
        </div>
        {level !== "listen" && <div className="zhuyin-word-block"><h3>{puzzle.word}</h3></div>}
        {answeredCorrectly && <div className="zhuyin-reveal"><VerticalZhuyinWord word={level === "listen" ? puzzle.word[0] : puzzle.word} ruby={level === "listen" ? puzzle.answer[0] : puzzle.wordRuby} fontReady={fontReady} /></div>}
        {(level === "syllable" || level === "word") && !answeredCorrectly && <div className="zhuyin-build-zone" aria-label="你的注音">
          {question.answerParts.map((_, index) => <span key={index} className={answerParts[index] ? "filled" : ""}>{answerParts[index] || "？"}</span>)}
          {answerParts.length > 0 && !answeredCorrectly && <button type="button" onClick={onUndo}>退回一格</button>}
        </div>}
        <div className={`zhuyin-choice-grid ${question.choiceKind === "image" ? "image-choices" : ""}`} role="group" aria-label="答案選項">
          {question.choices.map((choice) => <button className={`zhuyin-choice-button ${selectedAnswer === choice ? "wrong" : ""} ${answeredCorrectly && question.answerParts.includes(choice) ? "correct" : ""}`} type="button" key={choice} aria-label={`選擇${choice}`} onClick={() => onAnswer(choice)} disabled={answeredCorrectly}>
            {question.choiceCharacters?.[choice] && fontReady ? <span className="bpmf-zihi-only" aria-hidden="true">{question.choiceCharacters[choice]}</span> : <span className="plain-zhuyin-choice">{choice}</span>}
          </button>)}
        </div>
        <p className={`zhuyin-feedback ${answeredCorrectly ? "success" : selectedAnswer ? "retry" : ""}`} role="status" aria-live="polite">{feedback || (level === "listen" ? "按播放題目，再選注音" : level === "initial" ? "選出第一個聲符" : "依序放入正確的聲音積木")}</p>
        {answeredCorrectly && <button className="zhuyin-next-button" type="button" onClick={onContinue}><span>{questionIndex + 1 < totalQuestions ? "下一題" : "完成這個等級"}</span><span aria-hidden="true">→</span></button>}
      </section>
    </>}
  </div>;
}
