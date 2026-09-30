export type IntegrationState='CONNECTED'|'DEGRADED'|'REVOKED'|'UNKNOWN';
export type IntegrationCoverage='OBSERVED'|'PARTIAL'|'UNKNOWN';
export interface IntegrationObservation{organizationId:string;provider:string;connectionId:string;state:IntegrationState;coverage:IntegrationCoverage;scopes:string[];observedAt:string;limitations:string[];evidenceHash:string|null}
const id=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;const hash=/^[a-f0-9]{64}$/;
export function integrationObservation(x:IntegrationObservation):IntegrationObservation{
 if(!x.organizationId.trim()||!id.test(x.provider)||!id.test(x.connectionId))throw Error('INVALID_INTEGRATION_IDENTITY');
 if(!Number.isFinite(Date.parse(x.observedAt))||Date.parse(x.observedAt)>Date.now()+300000)throw Error('INVALID_INTEGRATION_CHRONOLOGY');
 if(x.evidenceHash!==null&&!hash.test(x.evidenceHash))throw Error('INVALID_EVIDENCE_HASH');
 if(x.state==='CONNECTED'&&x.evidenceHash===null)throw Error('CONNECTED_REQUIRES_EVIDENCE');
 if(x.coverage==='OBSERVED'&&x.evidenceHash===null)throw Error('OBSERVED_COVERAGE_REQUIRES_EVIDENCE');
 if(x.state==='REVOKED'&&x.coverage==='OBSERVED')throw Error('REVOKED_CANNOT_HAVE_OBSERVED_COVERAGE');
 if(x.state==='UNKNOWN'&&x.coverage==='OBSERVED')throw Error('UNKNOWN_CONNECTION_CANNOT_HAVE_OBSERVED_COVERAGE');
 if(x.coverage==='OBSERVED'&&!x.limitations.length)throw Error('COVERAGE_LIMITATIONS_REQUIRED');
 return{...x,scopes:[...new Set(x.scopes.map(s=>s.trim()).filter(Boolean))],limitations:[...x.limitations]};
}
export function coverageFromCollection(input:{connected:boolean;pageComplete:boolean;rateLimited:boolean;credentialRejected:boolean;recordsObserved:number}):IntegrationCoverage{
 if(!input.connected||input.credentialRejected)return'UNKNOWN';
 if(input.rateLimited||!input.pageComplete)return'PARTIAL';
 return input.recordsObserved>=0?'OBSERVED':'UNKNOWN';
}
