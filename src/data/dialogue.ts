import type { RubySegment } from "../types";

export const r = (text: string, ruby: string): RubySegment => ({ text, ruby });

export const zhuyin = {
  xiaohang: "ㄒㄧㄠˇ ㄏㄤˊ",
  forest: "ㄙㄣ ㄌㄧㄣˊ",
  adventure: "ㄇㄠˋ ㄒㄧㄢˇ",
  treasure: "ㄅㄠˇ ㄨˋ",
  forestBook: "ㄙㄣ ㄌㄧㄣˊ ㄕㄨ",
  sticker: "ㄊㄧㄝ ㄓˇ",
  star: "ㄒㄧㄥ ㄒㄧㄥ",
};

export const dialogue = {
  title: [r("小航", zhuyin.xiaohang), "的", r("森林冒險", "ㄙㄣ ㄌㄧㄣˊ ㄇㄠˋ ㄒㄧㄢˇ")],
  chapterSelectHeadline: [
    r("飛機", "ㄈㄟ ㄐㄧ"),
    "壞掉了！",
  ],
  chapterSelectBody: [
    "先去",
    r("森林", zhuyin.forest),
    "找",
    r("零件", "ㄌㄧㄥˊ ㄐㄧㄢˋ"),
    "。",
  ],
  introHeadline: [
    r("小航", zhuyin.xiaohang),
    "準備好囉，一起去",
    r("森林", zhuyin.forest),
    "找",
    r("寶物", zhuyin.treasure),
    "。",
  ],
  introBody: [
    "找到的小驚喜，會放進",
    r("森林書", zhuyin.forestBook),
    "變成",
    r("貼紙", zhuyin.sticker),
    "。",
  ],
  startAdventure: [r("開始冒險", "ㄎㄞ ㄕˇ ㄇㄠˋ ㄒㄧㄢˇ")],
  continueAdventure: [r("繼續冒險", "ㄐㄧˋ ㄒㄩˋ ㄇㄠˋ ㄒㄧㄢˇ")],
  replayAdventure: [r("再玩一次", "ㄗㄞˋ ㄨㄢˊ ㄧˊ ㄘˋ")],
  backHome: [r("回桌面", "ㄏㄨㄟˊ ㄓㄨㄛ ㄇㄧㄢˋ")],
  backIsland: [r("回島嶼", "ㄏㄨㄟˊ ㄉㄠˇ ㄩˇ")],
  hintButton: [r("小航提示", "ㄒㄧㄠˇ ㄏㄤˊ ㄊㄧˊ ㄕˋ")],
  rewardHeadline: [
    r("成功", "ㄔㄥˊ ㄍㄨㄥ"),
    "取得",
    r("寶物", zhuyin.treasure),
    "！",
  ],
  nextStage: [r("下一段森林路", "ㄒㄧㄚˋ ㄧˊ ㄉㄨㄢˋ ㄙㄣ ㄌㄧㄣˊ ㄌㄨˋ")],
  seeResult: [r("看今天的成果", "ㄎㄢˋ ㄐㄧㄣ ㄊㄧㄢ ㄉㄜ˙ ㄔㄥˊ ㄍㄨㄛˇ")],
  completeHeadline: [
    r("今天", "ㄐㄧㄣ ㄊㄧㄢ"),
    "的",
    r("森林書", zhuyin.forestBook),
    "完成囉！",
  ],
  completeSummary: (): RubySegment[] => [
    "我們把",
    r("零件", "ㄌㄧㄥˊ ㄐㄧㄢˋ"),
    "帶回",
    r("島上", "ㄉㄠˇ ㄕㄤˋ"),
    "吧。",
  ],
  resetProgress: [r("再玩一次", "ㄗㄞˋ ㄨㄢˊ ㄧˊ ㄘˋ")],
};
