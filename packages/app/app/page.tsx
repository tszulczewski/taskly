import { Suspense } from "react";
import { TaskPage } from "../components/tasks/task-page";

export default function Home() {
  return (
    <Suspense>
      <TaskPage />
    </Suspense>
  );
}
