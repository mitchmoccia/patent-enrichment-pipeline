import { type GatewayModelId, gateway, generateText, Output } from "ai";
import type { IntakeSource } from "./intake";
import { type IntakeOutput, intakeOutputSchema } from "./roles";

/** The id is chosen in the environment. This module does not pick a model. */
function configuredModel(modelId: string): GatewayModelId {
  return modelId as GatewayModelId;
}

/** Live intake. Callers must already know a gateway key and an approved model id are set. */
export async function liveIntake(
  modelId: string,
  prompt: string,
  sources: readonly IntakeSource[],
): Promise<IntakeOutput> {
  const result = await generateText({
    model: gateway(configuredModel(modelId)),
    output: Output.object({ schema: intakeOutputSchema }),
    system: prompt,
    prompt: sources.map((source) => `${source.id} [${source.role}] ${source.text}`).join("\n\n"),
    maxRetries: 0,
  });
  return intakeOutputSchema.parse(result.output);
}
