import { createHash } from 'node:crypto'; import type { VerificationRecord } from './domain/media.js';
export interface CanadaElectionContext { electionRelated:boolean; coveredPersonOrAuthority:boolean; intentToMislead:'YES'|'NO'|'UNKNOWN'; parodyOrSatire:boolean; authorizedSource:'YES'|'NO'|'UNKNOWN'; }
export function assessCanadaElectionRisk(record:VerificationRecord,c:CanadaElectionContext){
 const triggers:string[]=[]; const actions:string[]=[]; const limitations:string[]=[];
 if(!c.electionRelated)return {status:'NOT_APPLICABLE' as const,triggers,actions,limitations,digest:''};
 if(c.parodyOrSatire)return {status:'EXCEPTION_REVIEW' as const,triggers:['PARODY_OR_SATIRE_ASSERTED'],actions:['Preserve evidence supporting the asserted parody/satire context.'],limitations:['Exception applicability is a legal/context determination.'],digest:''};
 const synthetic=['AI_DEEPFAKE','AI_SYNTHETIC_PERSON','AI_SYNTHETIC_VOICE','AI_GENERATED'].includes(record.aiStatus);
 if(c.coveredPersonOrAuthority&&synthetic)triggers.push('SYNTHETIC_ELECTION_PERSON_OR_AUTHORITY');
 if(c.intentToMislead==='YES')triggers.push('INTENT_TO_MISLEAD_ASSERTED'); else if(c.intentToMislead==='UNKNOWN')limitations.push('Intent to mislead cannot be established automatically.');
 if(c.authorizedSource==='NO')triggers.push('SOURCE_NOT_AUTHORIZED'); else if(c.authorizedSource==='UNKNOWN')limitations.push('Publication authorization is unknown.');
 if(triggers.length)actions.push('HOLD','PRESERVE_PROVENANCE_AND_SOURCE_EVIDENCE','RESOLVE_REQUIRED_FACTS_BEFORE_RELEASE');
 const status=actions.length?'HOLD':limitations.length?'HOLD':'NO_DISCLOSURE_REQUIRED';
 const base={status,triggers,actions,limitations,legalSources:['Canada Elections Act s. 480.1','Canada Elections Act s. 481'],assetSha256:record.asset.sha256};
 return {...base,digest:createHash('sha256').update(JSON.stringify(base)).digest('hex')};
}
