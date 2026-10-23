export interface SubtaskProgressProps {
  done: number;
  total: number;
  /** What is shown, e.g. "1/3". */
  text?: (done: number, total: number) => string;
  /** What a screen reader hears, e.g. "1 of 3 subtasks completed". */
  label?: (done: number, total: number) => string;
}

const defaultText = (done: number, total: number) => `${done}/${total}`;
const defaultLabel = (done: number, total: number) =>
  `${done} of ${total} ${total === 1 ? "subtask" : "subtasks"} completed`;

/**
 * How many subtasks of a task are done, "1/3", in the meta line (Luki 6); it hints that the task
 * can be completed (R11). "1/3" alone is unclear when read out, so it is read as words.
 */
export function SubtaskProgress({
  done,
  total,
  text = defaultText,
  label = defaultLabel,
}: SubtaskProgressProps) {
  return (
    <span data-slot="subtask-progress" className="numeric">
      <span aria-hidden="true">{text(done, total)}</span>
      <span className="sr-only">{label(done, total)}</span>
    </span>
  );
}
