import { z } from "zod";
export { z };

const DmPolicySchema = z.enum(["open", "pairing", "allowlist"]);
const GroupPolicySchema = z.enum(["open", "allowlist", "disabled"]);

const ToolPolicySchema = z
  .object({
    allow: z.array(z.string()).optional(),
    deny: z.array(z.string()).optional(),
  })
  .strict()
  .optional();

const DmConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    systemPrompt: z.string().optional(),
  })
  .strict()
  .optional();

export const WecomGroupSchema = z
  .object({
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema,
    skills: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    systemPrompt: z.string().optional(),
  })
  .strict();

export const WecomConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    corpId: z.string().optional(),
    corpSecret: z.string().optional(),
    agentId: z.union([z.string(), z.number()]).optional(),
    token: z.string().optional(),
    encodingAESKey: z.string().optional(),
    webhookPath: z.string().optional().default("/wecom/events"),
    webhookPort: z.number().int().positive().optional(),
    dmPolicy: DmPolicySchema.optional().default("pairing"),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupPolicy: GroupPolicySchema.optional().default("allowlist"),
    groupAllowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    requireMention: z.boolean().optional().default(true),
    groups: z.record(z.string(), WecomGroupSchema.optional()).optional(),
    historyLimit: z.number().int().min(0).optional(),
    dmHistoryLimit: z.number().int().min(0).optional(),
    dms: z.record(z.string(), DmConfigSchema).optional(),
    textChunkLimit: z.number().int().positive().optional(),
    chunkMode: z.enum(["length", "newline"]).optional(),
    mediaMaxMb: z.number().positive().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.dmPolicy === "open") {
      const allowFrom = value.allowFrom ?? [];
      const hasWildcard = allowFrom.some((entry) => String(entry).trim() === "*");
      if (!hasWildcard) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allowFrom"],
          message: 'channels.wecom.dmPolicy="open" requires channels.wecom.allowFrom to include "*"',
        });
      }
    }
  });
