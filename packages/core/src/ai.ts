import "server-only";
import { NotImplementedError } from "./errors";
import type { Estimate } from "./schemas";
import type { Db } from "./types";

// TODO: call Claude from the server (@anthropic-ai/sdk), request JSON, validate with aiEstimateResponse.
export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

export type Estimator = (prompt: string) => Promise<Estimate>;

export const claudeEstimator: Estimator = async () => {
  throw new NotImplementedError("claudeEstimator");
};

export async function estimateTask(_db: Db, _userId: string, _taskId: string, _estimator: Estimator = claudeEstimator): Promise<unknown> {
  throw new NotImplementedError("estimateTask");
}
