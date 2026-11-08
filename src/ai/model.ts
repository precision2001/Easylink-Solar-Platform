import { BedrockRuntimeClient, ConverseCommand, type Message, type Tool, type ContentBlock } from "@aws-sdk/client-bedrock-runtime";

/**
 * Model access (spec 6.4). Everything goes through Amazon Bedrock Converse in
 * ap-southeast-2 with Australian cross-region inference profiles, so prompts and
 * customer data stay in Australia. Model ids are configuration, not code.
 */
export type ModelTier = "fast" | "smart";

export type ToolUse = { toolUseId: string; name: string; input: Record<string, unknown> };
export type ModelTurn = {
  text: string;
  toolUses: ToolUse[];
  stopReason: string;
  usage: { inputTokens: number; outputTokens: number };
};

export type ChatMessage =
  | {
      role: "user";
      text?: string;
      image?: { format: "jpeg" | "png" | "webp"; bytes: Uint8Array };
      /** More images in the same turn, after `image` (e.g. a second view of the same scene). */
      images?: { format: "jpeg" | "png" | "webp"; bytes: Uint8Array }[];
      /** A PDF or office document for the model to read (Bedrock document block). */
      document?: { format: "pdf" | "docx" | "doc" | "xlsx" | "xls" | "csv" | "txt"; name: string; bytes: Uint8Array };
      toolResults?: { toolUseId: string; json: unknown; error?: boolean }[];
    }
  | { role: "assistant"; text: string; toolUses: ToolUse[] };

/** How hard a new-generation model (Claude 5.x) thinks before answering. Ignored by older models. */
export type Effort = "low" | "medium" | "high";

export type ConverseArgs = { tier: ModelTier; system: string; messages: ChatMessage[]; tools?: Tool[]; maxTokens?: number; effort?: Effort };

export interface ModelClient {
  converse(args: ConverseArgs): Promise<ModelTurn>;
}

/*
 * Two model generations run here. Claude 4.5 (Haiku, Sonnet) take
 * `temperature`. Claude 5.x (Opus 5.5 and on) reject it ("`temperature` is
 * deprecated for this model"), always think before answering, and count the
 * thinking towards maxTokens — so for those we leave temperature out, set an
 * effort level, and add room for the thinking. Thinking blocks in replies are
 * skipped (only text and tool use are read), and tool loops work without
 * sending them back (checked on Bedrock, 8 Nov 2026).
 */
const NEW_GENERATION = /claude-(?:opus|sonnet|haiku|fable|mythos)-(?:[5-9])(?:[-.]|$)/;
const NO_TEMPERATURE = new Set<string>();
/** Extra output room for thinking on new-generation models. */
export const THINKING_HEADROOM_TOKENS = 2000;

export function isNewGenerationModel(modelId: string): boolean {
  return NEW_GENERATION.test(modelId);
}

export function inferenceFor(modelId: string, maxTokens: number, effort: Effort = "low") {
  const newGen = isNewGenerationModel(modelId);
  if (newGen || NO_TEMPERATURE.has(modelId)) {
    return {
      inferenceConfig: { maxTokens: newGen ? maxTokens + THINKING_HEADROOM_TOKENS : maxTokens },
      additionalModelRequestFields: newGen ? { output_config: { effort } } : undefined,
    };
  }
  return { inferenceConfig: { maxTokens, temperature: 0.2 }, additionalModelRequestFields: undefined };
}

const rejectsTemperature = (err: unknown) =>
  err instanceof Error && err.name === "ValidationException" && /temperature/i.test(err.message);

/** Approximate AUD cost per 1k tokens, for the daily budget meter. Set from current pricing. */
export const COST_PER_1K_AUD: Record<ModelTier, { in: number; out: number }> = {
  fast: { in: Number(process.env.COST_FAST_IN ?? 0.0015), out: Number(process.env.COST_FAST_OUT ?? 0.0075) },
  smart: { in: Number(process.env.COST_SMART_IN ?? 0.0046), out: Number(process.env.COST_SMART_OUT ?? 0.023) },
};

export function turnCostAud(tier: ModelTier, t: ModelTurn) {
  const c = COST_PER_1K_AUD[tier];
  return (t.usage.inputTokens / 1000) * c.in + (t.usage.outputTokens / 1000) * c.out;
}

export class BedrockModel implements ModelClient {
  constructor(
    private ids: Record<ModelTier, string> = {
      fast: process.env.MODEL_FAST_ID ?? "",
      smart: process.env.MODEL_SMART_ID ?? "",
    },
    private client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "ap-southeast-2" }),
  ) {}

  async converse(args: ConverseArgs): Promise<ModelTurn> {
    const modelId = this.ids[args.tier];
    if (!modelId) throw new Error(`Model id for tier "${args.tier}" is not configured (MODEL_${args.tier.toUpperCase()}_ID)`);
    const send = () =>
      this.client.send(
        new ConverseCommand({
          modelId,
          system: [{ text: args.system }],
          messages: args.messages.map(toBedrock),
          toolConfig: args.tools?.length ? { tools: args.tools } : undefined,
          ...inferenceFor(modelId, args.maxTokens ?? 1500, args.effort),
        }),
      );
    let res;
    try {
      res = await send();
    } catch (err) {
      // A model we didn't recognise as new-generation turned `temperature` down: retry once without it, and remember.
      if (!rejectsTemperature(err) || NO_TEMPERATURE.has(modelId)) throw err;
      NO_TEMPERATURE.add(modelId);
      res = await send();
    }
    const blocks = res.output?.message?.content ?? [];
    return {
      text: blocks.map((b) => ("text" in b && b.text ? b.text : "")).join(""),
      toolUses: blocks
        .filter((b): b is ContentBlock.ToolUseMember => "toolUse" in b && !!b.toolUse)
        .map((b) => ({ toolUseId: b.toolUse.toolUseId!, name: b.toolUse.name!, input: (b.toolUse.input ?? {}) as Record<string, unknown> })),
      stopReason: res.stopReason ?? "end_turn",
      usage: { inputTokens: res.usage?.inputTokens ?? 0, outputTokens: res.usage?.outputTokens ?? 0 },
    };
  }
}

function toBedrock(m: ChatMessage): Message {
  if (m.role === "assistant") {
    const content: ContentBlock[] = [];
    if (m.text) content.push({ text: m.text });
    for (const t of m.toolUses) content.push({ toolUse: { toolUseId: t.toolUseId, name: t.name, input: t.input as never } });
    return { role: "assistant", content };
  }
  const content: ContentBlock[] = [];
  for (const r of m.toolResults ?? []) {
    content.push({ toolResult: { toolUseId: r.toolUseId, content: [{ json: r.json as never }], status: r.error ? "error" : "success" } });
  }
  if (m.image) content.push({ image: { format: m.image.format, source: { bytes: m.image.bytes } } });
  for (const im of m.images ?? []) content.push({ image: { format: im.format, source: { bytes: im.bytes } } });
  if (m.document) {
    // Bedrock allows letters, digits, spaces, hyphens, parentheses and square brackets in document names.
    const name = m.document.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9 \-()[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "document";
    content.push({ document: { format: m.document.format, name, source: { bytes: m.document.bytes } } });
  }
  if (m.text) content.push({ text: m.text });
  return { role: "user", content };
}

/**
 * Scripted model for tests and local development. Each call pops the next turn;
 * a function lets a test look at the conversation so far.
 */
export class FakeModel implements ModelClient {
  calls: { tier: ModelTier; system: string; messages: ChatMessage[]; toolNames: string[] }[] = [];
  constructor(private script: (ModelTurnInput | ((ctx: { messages: ChatMessage[]; system: string }) => ModelTurnInput))[] = []) {}
  push(t: ModelTurnInput) {
    this.script.push(t);
  }
  async converse(args: ConverseArgs): Promise<ModelTurn> {
    this.calls.push({ tier: args.tier, system: args.system, messages: structuredClone(args.messages), toolNames: (args.tools ?? []).map((t) => ("toolSpec" in t ? t.toolSpec?.name ?? "" : "")) });
    const next = this.script.shift();
    const t = typeof next === "function" ? next({ messages: args.messages, system: args.system }) : next ?? { text: "No action needed." };
    const toolUses = (t.tools ?? []).map((u, i) => ({ toolUseId: `tu_${this.calls.length}_${i}`, name: u.name, input: u.input }));
    return { text: t.text ?? "", toolUses, stopReason: toolUses.length ? "tool_use" : "end_turn", usage: { inputTokens: 500, outputTokens: 100 } };
  }
}
export type ModelTurnInput = { text?: string; tools?: { name: string; input: Record<string, unknown> }[] };
