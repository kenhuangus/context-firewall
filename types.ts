// Core Data Models matching the Specification

export type ContextItemType =
  | 'user_message'
  | 'system_policy'
  | 'retrieved_doc'
  | 'web_content'
  | 'tool_schema'
  | 'tool_output'
  | 'memory_slice'
  | 'environment_state';

export type TrustTier = 'trusted' | 'constrained' | 'untrusted';

export interface ContextItem {
  id: string;
  type: ContextItemType;
  sourceUri: string;
  trustTier: TrustTier;
  content: string; // Simplified to string for demo purposes, spec allows Record<string, unknown>
  provenance: {
    timestamp: string; // ISO 8601
    sha256: string;
    signer?: string;
  };
  sanitization?: {
    status: 'clean' | 'masked' | 'rejected';
    signals: string[];
    reason?: string;
    transformsApplied?: string[];
    originalContent?: string; // For diffing
  };
}

export interface Goal {
  task: string;
  constraints: string[];
  policyVersion: string;
  riskProfile: 'low' | 'medium' | 'high' | 'critical';
}

export interface CompiledContextBlock {
  blockType: ContextItemType;
  boundaryTag: string; // e.g., "<<<TRUSTED:POLICY>>>"
  trustTier: TrustTier;
  tokenCount: number;
  text: string;
  itemIds: string[];
}

export interface CompiledContext {
  runId: string;
  createdAt: string;
  blocks: CompiledContextBlock[];
  budgets: {
    maxTokens: number;
    totalTokens: number;
    perTypeCaps: Record<ContextItemType, number>;
  };
  compilationHash: string;
}

export interface CxBOM {
  runId: string;
  createdAt: string;
  system: {
    agentName: string;
    version: string;
  };
  goal: Goal;
  contextItems: Array<{
    id: string;
    type: ContextItemType;
    trustTier: TrustTier;
    sha256: string;
    sanitizationStatus: 'clean' | 'masked' | 'rejected';
    signals: string[];
  }>;
  integrity: {
    cxbomHash: string;
  };
}

export interface FirewallReport {
  admitted: number;
  masked: number;
  rejected: number;
  signalsFired: string[];
}

export interface CompilationResult {
  runId: string;
  compiledContext: CompiledContext;
  cxbom: CxBOM;
  firewallReport: FirewallReport;
  interventions: ContextItem[];
}