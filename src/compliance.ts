import { createHash } from 'node:crypto';
import type { AiStatus, MediaKind, VerificationRecord } from './domain/media.js';

export type ComplianceJurisdiction = 'EU_AI_ACT_ARTICLE_50';
export type ComplianceStatus = 'COMPLIANT' | 'ACTION_REQUIRED' | 'NOT_APPLICABLE' | 'UNKNOWN';
export interface DisclosureContext {
  jurisdiction: ComplianceJurisdiction;
  actor: 'provider' | 'deployer';
  publicInterest?: boolean;
  humanReviewed?: boolean;
  editorialResponsibility?: boolean;
  creativeSatiricalFictional?: boolean;
}
export interface ComplianceAssessment {
  schemaVersion: '1.0';
  jurisdiction: ComplianceJurisdiction;
  legalBasis: 'EU_AI_ACT_ARTICLE_50';
  assessedAt: string;
  status: ComplianceStatus;
  obligations: string[];
  requiredActions: string[];
  evidence: { assetSha256: string; aiStatus: AiStatus; provenanceStatus: string; declaredAiUse: AiStatus; mediaKind: MediaKind };
  limitations: string[];
  recordDigest: string;
}
const generated = new Set<AiStatus>(['AI_GENERATED','AI_SYNTHETIC_PERSON','AI_SYNTHETIC_VOICE','AI_DEEPFAKE','AI_EDITED']);
export function assessDisclosureCompliance(record: VerificationRecord, context: DisclosureContext): ComplianceAssessment {
  const obligations:string[]=[]; const requiredActions:string[]=[]; const limitations:string[]=[];
  const declared=record.asset.declaredAiUse ?? 'UNKNOWN'; const status=record.aiStatus;
  if (context.actor === 'provider') {
    obligations.push('Article 50(2): mark synthetic audio, image, video or text outputs in a machine-readable format and make them detectable as artificially generated or manipulated.');
    if (generated.has(status) || generated.has(declared)) requiredActions.push('Ensure an effective, interoperable, robust and reliable machine-readable AI-generation/manipulation mark is present.');
    if (status === 'UNKNOWN' && declared === 'UNKNOWN') limitations.push('AI generation/manipulation status is unknown; compliance cannot be inferred.');
  } else {
    if (status === 'AI_DEEPFAKE' || declared === 'AI_DEEPFAKE') {
      obligations.push('Article 50(4): disclose deepfake content clearly to exposed natural persons.');
      requiredActions.push('Apply a clear, distinguishable, perceivable human-facing disclosure no later than first exposure.');
    }
    if ((record.asset.kind === 'text' || record.asset.kind === 'article' || record.asset.kind === 'news_report' || record.asset.kind === 'social_post') && context.publicInterest) {
      obligations.push('Article 50(4): disclose AI-generated/manipulated public-interest text unless the applicable human-review/editorial-responsibility exception is satisfied.');
      if (!(context.humanReviewed && context.editorialResponsibility)) requiredActions.push('Apply a clear disclosure that the public-interest text was artificially generated or manipulated.');
    }
    if (context.creativeSatiricalFictional) limitations.push('Creative, satirical, fictional or analogous works may be subject to specific disclosure treatment; context-specific legal review may be required.');
    if (status === 'UNKNOWN' && declared === 'UNKNOWN') limitations.push('AI/deepfake status is unknown; absence of a disclosure obligation cannot be established.');
  }
  let complianceStatus:ComplianceStatus;
  if (requiredActions.length) complianceStatus='ACTION_REQUIRED';
  else if (limitations.some(x=>x.includes('cannot'))) complianceStatus='UNKNOWN';
  else if (obligations.length) complianceStatus='COMPLIANT';
  else complianceStatus='NOT_APPLICABLE';
  const base={schemaVersion:'1.0' as const,jurisdiction:context.jurisdiction,legalBasis:'EU_AI_ACT_ARTICLE_50' as const,assessedAt:new Date().toISOString(),status:complianceStatus,obligations,requiredActions,evidence:{assetSha256:record.asset.sha256,aiStatus:status,provenanceStatus:record.provenance.status,declaredAiUse:declared,mediaKind:record.asset.kind},limitations};
  return {...base,recordDigest:createHash('sha256').update(JSON.stringify(base)).digest('hex')};
}
