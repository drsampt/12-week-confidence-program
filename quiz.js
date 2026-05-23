import { questions } from "./questions.js";

export class Quiz {
  constructor(onComplete) {
    this.questions = questions;
    this.answers = {};
    this.currentIndex = 0;
    this.onComplete = onComplete;
  }

  get current() {
    return this.questions[this.currentIndex];
  }

  get progress() {
    return ((this.currentIndex) / this.questions.length) * 100;
  }

  get isFirst() {
    return this.currentIndex === 0;
  }

  get isLast() {
    return this.currentIndex === this.questions.length - 1;
  }

  select(value) {
    const q = this.current;
    if (q.type === "multi") {
      const current = this.answers[q.id] || [];
      const idx = current.indexOf(value);
      if (idx > -1) {
        this.answers[q.id] = current.filter((v) => v !== value);
      } else if (current.length < (q.max || 2)) {
        this.answers[q.id] = [...current, value];
      }
    } else {
      this.answers[q.id] = value;
    }
  }

  isSelected(value) {
    const ans = this.answers[this.current.id];
    if (Array.isArray(ans)) return ans.includes(value);
    return ans === value;
  }

  canAdvance() {
    const ans = this.answers[this.current.id];
    if (!ans) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    return true;
  }

  next() {
    if (!this.canAdvance()) return false;
    if (this.isLast) {
      this.onComplete(this.answers);
      return true;
    }
    this.currentIndex++;
    return true;
  }

  prev() {
    if (this.isFirst) return;
    this.currentIndex--;
  }
}
