import { 
  CompiledContext, 
  ContextItem, 
  ContextItemType, 
  CxBOM, 
  CompilationResult, 
  Goal, 
  CompiledContextBlock, 
  TrustTier 
} from "../types";
import { SANITIZATION_SIGNALS } from "../constants";

// --- Utility Functions ---

// Simple string hashing for demo purposes (in prod use crypto.subtle)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

const countTokens = (text: string) => Math.ceil(text.length / 4);

// --- Sanitization Engine ---

const applySanitization = (item: ContextItem): ContextItem => {
  // Deep copy
  const processed = { ...item, sanitization: { ...item.sanitization } } as ContextItem;
  
  if (item.trustTier === 'trusted') {
    processed.sanitization = { status: 'clean', signals: [] };
    return processed;
  }

  const signalsFound: string[] = [];
  let content = item.content;

  // Check signals
  Object.entries(SANITIZATION_SIGNALS).forEach(([signalName, patterns]) => {
    patterns.forEach(regex => {
      if (regex.test(content)) {
        signalsFound.push(signalName);
      }
    });
  });

  // Apply Transforms based on Tier (Simplified Logic from Spec)
  if (signalsFound.length > 0) {
    const uniqueSignals = [...new Set(signalsFound)];
    
    // HEURISTIC: Instruction Override is Critical -> REJECT
    // Note: item.trustTier !== 'trusted' is implicit here due to early return
    if (uniqueSignals.includes('instruction_override')) {
         processed.sanitization = {
            status: 'rejected',
            signals: uniqueSignals,
            reason: 'Critical Policy Violation: Instruction Override attempt detected in untrusted content.',
            originalContent: item.content
        };
        // We do not modify content here for rejected items, as they are dropped later.
        // But we keep originalContent for the diff view.
    } 
    // HEURISTIC: Tool Coercion / Credential Leaks -> MASK
    else {
        processed.sanitization = {
            status: 'masked',
            signals: uniqueSignals,
            reason: 'Content sanitized to neutralize detected signals.',
            originalContent: item.content
        };
        
        // Naive masking: Replace matching lines or segments
        // In a real impl, this would be more granular. 
        processed.content = `[REDACTED: Context Firewall masked patterns: ${uniqueSignals.join(', ')}]`;
    }
  } else {
    processed.sanitization = { status: 'clean', signals: [] };
  }

  return processed;
};

// --- Deterministic Compilation Engine ---

const COMPILATION_ORDER: { 
  tier: TrustTier[], 
  typePriority: Record<ContextItemType, number> 
} = {
  tier: ['trusted', 'constrained', 'untrusted'],
  typePriority: {
    system_policy: 1,
    user_message: 2,
    tool_schema: 3,
    retrieved_doc: 4,
    memory_slice: 5,
    tool_output: 6,
    web_content: 7,
    environment_state: 8
  }
};

export const compileContext = (goal: Goal, rawItems: ContextItem[]): CompilationResult => {
  const runId = `run-${simpleHash(Date.now().toString())}`;
  
  // 1. Sanitize
  const sanitizedItems = rawItems.map(applySanitization);

  // 2. Sort (Deterministic Ordering)
  const sortedItems = [...sanitizedItems].sort((a, b) => {
    // Primary: Tier
    const tierDiff = COMPILATION_ORDER.tier.indexOf(a.trustTier) - COMPILATION_ORDER.tier.indexOf(b.trustTier);
    if (tierDiff !== 0) return tierDiff;

    // Secondary: Type
    const typeDiff = COMPILATION_ORDER.typePriority[a.type] - COMPILATION_ORDER.typePriority[b.type];
    if (typeDiff !== 0) return typeDiff;

    // Tertiary: Source URI
    return a.sourceUri.localeCompare(b.sourceUri);
  });

  // 3. Construct Blocks & Boundaries
  // FILTER: Rejected items do not enter the stream
  const validItems = sortedItems.filter(i => i.sanitization?.status !== 'rejected');

  const blocks: CompiledContextBlock[] = validItems.map(item => ({
    blockType: item.type,
    boundaryTag: `<<<${item.trustTier.toUpperCase()}:${item.type.toUpperCase()}>>>`,
    trustTier: item.trustTier,
    tokenCount: countTokens(item.content),
    text: item.content,
    itemIds: [item.id]
  }));

  const totalTokens = blocks.reduce((acc, b) => acc + b.tokenCount, 0);

  // 4. Generate Hashes
  const compiledContentString = blocks.map(b => b.boundaryTag + b.text).join('\n');
  const compilationHash = simpleHash(compiledContentString);

  // 5. Build Reports
  const firewallReport = {
    admitted: sanitizedItems.filter(i => i.sanitization?.status === 'clean').length,
    masked: sanitizedItems.filter(i => i.sanitization?.status === 'masked').length,
    rejected: sanitizedItems.filter(i => i.sanitization?.status === 'rejected').length,
    signalsFired: sanitizedItems.flatMap(i => i.sanitization?.signals || []),
  };
  
  const interventions = sanitizedItems.filter(i => i.sanitization?.status !== 'clean');

  const compiledContext: CompiledContext = {
    runId,
    createdAt: new Date().toISOString(),
    blocks,
    budgets: {
      maxTokens: 8192,
      totalTokens,
      perTypeCaps: {} as any // simplified
    },
    compilationHash
  };

  const cxbom: CxBOM = {
    runId,
    createdAt: new Date().toISOString(),
    system: {
      agentName: 'ContextFirewall-Ref-Impl',
      version: '1.0.0'
    },
    goal,
    contextItems: sanitizedItems.map(i => ({
      id: i.id,
      type: i.type,
      trustTier: i.trustTier,
      sha256: i.provenance.sha256,
      sanitizationStatus: i.sanitization?.status || 'clean',
      signals: i.sanitization?.signals || []
    })),
    integrity: {
      cxbomHash: simpleHash(JSON.stringify(sortedItems)) // simplified
    }
  };

  return { runId, compiledContext, cxbom, firewallReport, interventions };
};