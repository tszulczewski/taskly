import { useState } from "react";
import { TaskList, type TaskItem, type TaskText } from "../../src";
import { reorder } from "./TaskScreen";
import { validateTask } from "./task-data";

export interface OrderDemoProps {
  initialTasks: TaskItem[];
  text?: Partial<TaskText>;
}

const ok = async () => ({ ok: true as const });

/** A task list that only reorders (E02-S01), for the drag handle and reorder pages. */
export function OrderDemo({ initialTasks, text }: OrderDemoProps) {
  const [tasks, setTasks] = useState(initialTasks);
  return (
    <TaskList
      status="ready"
      tasks={tasks}
      onRetry={() => {}}
      validate={validateTask}
      onEdit={ok}
      onAddSubtask={ok}
      onDelete={async () => true}
      onMove={(id, position) => setTasks((list) => reorder(list, id, position))}
      text={text}
    />
  );
}
