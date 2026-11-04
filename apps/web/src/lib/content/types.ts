import type { Rng } from './rng';

export type QType = 'choice' | 'number' | 'fraction' | 'text';
export type Subject = 'math' | 'english' | 'chinese' | 'general';
export const SUBJECT_LABEL: Record<Subject, string> = { math: '數學', english: '英文', chinese: '中文', general: '常識' };

/** 完整題目：只存在伺服器端（含答案） */
export type ServerQuestion = {
  type: QType;
  prompt: string;
  choices?: string[];
  answer: string;
  accept?: string[]; // text 題的其他可接受答案
  explain?: string;
  tag: string; // 知識點
  unit: string;
  strict?: boolean; // fraction：必須是最簡分數
  suffix?: string; // 輸入框後的單位，例如「厘米」
};
/** 瀏覽器收到的版本：沒有答案、沒有解釋 */
export type ClientQuestion = Pick<ServerQuestion, 'type' | 'prompt' | 'choices' | 'tag' | 'suffix'>;
export type GenQuestion = Omit<ServerQuestion, 'unit'>;

export type Unit = {
  id: string;
  subject: Subject;
  grade: number; // 1..6
  title: string;
  intro: string[]; // 簡短講解
  tags: string[];
  gens?: Array<(r: Rng) => GenQuestion>; // 參數化生成（數學）
  bank?: GenQuestion[]; // 靜態題庫（內容包）
  source: string; // "builtin" 或內容包名稱
  license?: string;
  /** 教學內容：重點與常見錯誤（例題由系統按單元即時生成） */
  lesson?: Lesson;
};
export type Lesson = { points: string[]; pitfalls?: string[] };
