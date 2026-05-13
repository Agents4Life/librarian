export interface PipelineContext {
  vaultPath: string;
}

export interface PipelineStage<I, O> {
  name: string;
  run(input: I, ctx: PipelineContext): Promise<O>;
}

export type PipelineResult<O> =
  | { success: true; output: O; stage: string }
  | { success: false; error: string; stage: string };
