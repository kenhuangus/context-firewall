import { ContextItemType, TrustTier } from "./types";

export const TRUST_TIER_COLORS: Record<TrustTier, string> = {
  trusted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  constrained: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  untrusted: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export const CONTEXT_TYPES: ContextItemType[] = [
  'system_policy',
  'user_message',
  'tool_schema',
  'retrieved_doc',
  'memory_slice',
  'tool_output',
  'web_content',
  'environment_state',
];

export const INITIAL_GOAL = {
  task: 'Investigate CVE-2024-1234',
  constraints: ['deny email_send', 'require approval for db_dump'],
  policyVersion: 'v1.0.4',
  riskProfile: 'high' as const,
};

// Based on spec "Sanitization Engine"
export const SANITIZATION_SIGNALS = {
  instruction_override: [
    /ignore\s+(previous|above|all)\s+(instructions?|rules?|prompts?)/i,
    /system\s+prompt\s+is/i,
    /developer\s+message/i,
    /new\s+instructions?:/i
  ],
  tool_coercion: [
    /call\s+(tool|function|api)/i,
    /use\s+(tool|function|api)/i,
    /send\s+email/i,
    /delete\s+file/i,
    /execute\s+command/i
  ],
  credential_patterns: [
    /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}['"]?/i,
    /password\s*[:=]\s*['"][^'"]+['"]/i,
    /bearer\s+[a-zA-Z0-9\-._~+/]+=*/i,
    /sk-[a-zA-Z0-9]{20,}/i 
  ]
};

export const THREAT_MATRIX = [
  {
    threat: "Indirect prompt injection (IPI)",
    surface: "web_content, tickets, emails, PDFs",
    constructs: "context.rules with when conditions on item.type + item.trust_tier; action: mask/reject",
    enforcement: "Ingress → Sanitize → Compile",
    invariants: "I1, I2, I7"
  },
  {
    threat: "Instruction override of constraints",
    surface: "Untrusted data redefining policy",
    constructs: "defaults.ordering_rule, explicit inclusion of system policy; context.rules deny semantics",
    enforcement: "Compile (ordering + precedence)",
    invariants: "I2, I7"
  },
  {
    threat: "Tool coercion / action injection",
    surface: "Untrusted content instructs agent to call tools",
    constructs: "signals.detectors.tool_coercion; context.rules to mask coercion; tools.allow/deny",
    enforcement: "Sanitize + Action gate",
    invariants: "I2, I3"
  },
  {
    threat: "Unauthorized tool execution",
    surface: "Model proposes disallowed tools",
    constructs: "tools.registry + tools.allow per goal/risk; tools.deny; cross-tenant checks",
    enforcement: "Action gate",
    invariants: "I3"
  },
  {
    threat: "Tool argument smuggling",
    surface: "Hidden fields or coercive arguments",
    constructs: "args_schema_ref + strict validation rule; policy conditions on enums/ranges",
    enforcement: "Action gate",
    invariants: "I3"
  },
  {
    threat: "Tool-output injection (A5)",
    surface: "Tool results include instruction-like payloads",
    constructs: "context.rules specialized for item.type == 'tool_output'; defaults.sanitizer_mode",
    enforcement: "Ingress (tool output) → Sanitize",
    invariants: "I4, I1"
  },
  {
    threat: "Data exfiltration via model output",
    surface: "Output channel emits secrets",
    constructs: "signals.detectors.data_exfil + credential_patterns; context.rules redact sensitive spans",
    enforcement: "Sanitize + (optional output checks)",
    invariants: "I2, I6"
  },
  {
    threat: "Retrieval poisoning (RAG)",
    surface: "Poisoned docs inserted into KB",
    constructs: "trust.tiers default conservative; allow retrieval only from allowlisted source_uri",
    enforcement: "Ingress + Goal binding + Compile",
    invariants: "I1, I2"
  },
  {
    threat: "Memory poisoning (persistence)",
    surface: "Attacker stores malicious instructions",
    constructs: "memory.tiers.* with deny_classifications: ['instruction']; procedural.deny_by_default",
    enforcement: "Memory write gate",
    invariants: "I5, I6"
  }
];

export const DEMO_POLICY_YAML = `policy_version: "cxwf_pl_v1.0.0"
policy_digest: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

defaults:
  ordering_rule: "policy>goal>trusted>constrained>untrusted"
  sanitizer_mode: "mask"
  tokenizer: "heuristic_v1"
  cxbom:
    store_raw_content: false
    integrity_chain: true

trust:
  tiers: ["trusted", "constrained", "untrusted"]
  upgrade_rules:
    - when: "item.provenance.signer == 'policy-signer' and item.type == 'system_policy'"
      set_trust_tier: "trusted"

context:
  budgets:
    max_tokens: 8192
    per_type_caps:
      system_policy: 1200
      user_message: 800
      web_content: 800
  rules:
    - name: "untrusted-web-quarantine"
      when: "item.type == 'web_content' and item.trust_tier == 'untrusted'"
      action: "mask"
      transforms: ["strip_tool_coercion", "mask_instruction_override"]
      boundary_tag: "cx:web:{item.id}"
    - name: "trusted-rag-admit"
      when: "item.type == 'retrieved_doc' and item.trust_tier == 'trusted'"
      action: "admit"
      transforms: ["redact_secrets"]
      boundary_tag: "cx:rag:{item.id}"

tools:
  registry:
    vuln_db_lookup:
      args_schema_ref: "schemas/tools/vuln_db_lookup.json"
      risk: "low"
    email_send:
      args_schema_ref: "schemas/tools/email_send.json"
      risk: "high"
  allow:
    - when: "goal.risk_profile in ['low','medium']"
      tools: ["vuln_db_lookup"]
    - when: "goal.risk_profile == 'high' and 'outbound_email' in goal.constraints"
      tools: ["email_send"]
  approvals:
    - when: "tool == 'email_send'"
      mode: "break_glass"
      approver_roles: ["security_admin"]

signals:
  detectors:
    instruction_override:
      patterns: ["ignore previous instructions", "system prompt", "developer message"]
    tool_coercion:
      patterns: ["call tool", "use function", "send email", "delete file"]
    data_exfil:
      patterns: ["export all data", "print credentials", "paste secrets"]`;