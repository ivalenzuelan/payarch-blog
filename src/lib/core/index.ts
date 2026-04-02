import { agenticCheckoutE2E } from './diagrams/agenticCheckoutE2E';
import { z } from 'zod';

// ---------------------------------------------------------
// 1. EDGES
// ---------------------------------------------------------

export const EdgeTypeSchema = z.enum([
  'intent',          // High-level user intent (e.g., "pay 10 EUR")
  'iso8583',         // Traditional financial message (e.g., Auth Request 0100)
  'funds',           // Actual settlement/movement of money
  'tap-credential',  // NFC/Tokenization payload
]);
export type PayarchEdgeType = z.infer<typeof EdgeTypeSchema>;

export const BaseEdgeSchema = z.object({
  id: z.string(),
  source: z.string(), // ID of source node
  target: z.string(), // ID of target node
  type: EdgeTypeSchema,
  animated: z.boolean().optional().default(true),
  label: z.string().optional(),
  activeInSteps: z.array(z.string()).optional(),
  data: z.any().optional(),
});
export type PayarchEdge = z.infer<typeof BaseEdgeSchema>;

// ---------------------------------------------------------
// 2. STEPS & ANIMATION (PrimitiveStep)
// ---------------------------------------------------------

export const PrimitiveStepSchema = z.object({
  stepId: z.string(),
  active: z.boolean(),
  incomingEdge: z.string().optional(),
  outgoingEdge: z.string().optional(),
  layerText: z.object({
    business: z.string(),
    technical: z.string(),
    iso8583: z.string().optional(),
  }).optional(),
});
export type PrimitiveStep = z.infer<typeof PrimitiveStepSchema>;

export const ExplanationLayerSchema = z.enum(['business', 'technical', 'iso8583']);
export type PayarchExplanationLayer = z.infer<typeof ExplanationLayerSchema>;

// We store the steps as a Record keyed by stepId so we can quickly lookup animation states in a node
export const StepsRecordSchema = z.record(z.string(), PrimitiveStepSchema);

// ---------------------------------------------------------
// 3. BASE NODE
// ---------------------------------------------------------

export const BaseNodeDataSchema = z.object({
  label: z.string(),
  sublabel: z.string().optional(),
  layer: z.string().optional(),
  vendor: z.array(z.string()).optional(),
  properties: z.any().optional(),
  steps: StepsRecordSchema.optional(), // Map of stepId -> PrimitiveStep
});
export type BaseNodeData = z.infer<typeof BaseNodeDataSchema>;

export const BaseNodeSchema = z.object({
  id: z.string(),
  type: z.string(), // Extensible for concrete primitives
  position: z.object({ x: z.number(), y: z.number() }),
  data: BaseNodeDataSchema,
});
export type PayarchBaseNode = z.infer<typeof BaseNodeSchema>;

// ---------------------------------------------------------
// 4. CONCRETE PRIMITIVES
// ---------------------------------------------------------

// We use BaseNodeSchema for everything now so users can add any node type dynamically
export const PayarchNodeSchema = BaseNodeSchema;
export type PayarchNode = z.infer<typeof PayarchNodeSchema>;

// ---------------------------------------------------------
// 5. DIAGRAM DEFINITION (AST)
// ---------------------------------------------------------

export const DiagramSourceSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});
export type PayarchDiagramSource = z.infer<typeof DiagramSourceSchema>;

export const DiagramMetadataSchema = z.object({
  totalLatency: z.string().optional(),
  tapLatency: z.string().optional(),
  visanetLatency: z.string().optional(),
  issuerLatency: z.string().optional(),
  settlementCycle: z.string().optional(),
  tags: z.array(z.string()).optional(),
  protocols: z.array(z.string()).optional(),
  standards: z.array(z.string()).optional(),
  keyActors: z.array(z.string()).optional(),
  sources: z.array(DiagramSourceSchema).optional(),
  references: z.array(z.string().url()).optional(),
});
export type PayarchDiagramMetadata = z.infer<typeof DiagramMetadataSchema>;

export const DiagramDefinitionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  protocol: z.string().optional(),
  settlementCycle: z.string().optional(),
  metadata: DiagramMetadataSchema.optional(),
  nodes: z.array(PayarchNodeSchema),
  edges: z.array(BaseEdgeSchema),
  stepsOrder: z.array(z.string()), // Sequential list of stepIds for the animation timeline
});
export type PayarchDiagram = z.infer<typeof DiagramDefinitionSchema>;

// ---------------------------------------------------------
// 6. CANONICAL EXAMPLES
// ---------------------------------------------------------

export const DiagramExampleSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  featured: z.boolean().optional().default(false),
  diagram: DiagramDefinitionSchema,
});
export type PayarchDiagramExample = z.infer<typeof DiagramExampleSchema>;

export const diagramExamples: PayarchDiagramExample[] = [
  {
    id: agenticCheckoutE2E.id,
    title: agenticCheckoutE2E.title,
    summary:
      'Canonical end-to-end AI checkout flow covering intent, TAP identity, token retrieval, ISO 8583 authorization, issuer policy evaluation, and settlement.',
    featured: true,
    diagram: agenticCheckoutE2E,
  },
];

export function getDiagramExample(id: string): PayarchDiagramExample | undefined {
  return diagramExamples.find((example) => example.id === id);
}

// ---------------------------------------------------------
// 7. EXPORTS
// ---------------------------------------------------------
export { agenticCheckoutE2E };
