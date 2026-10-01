export const SLOS = Object.freeze({
 apiAvailability:{target:0.999,windowDays:30},
 apiLatency:{p95Ms:750,p99Ms:2000,windowDays:30},
 ingestionSuccess:{target:0.995,windowDays:30},
 m2mVerification:{target:0.999,windowDays:30},
 scannerAvailability:{target:0.995,windowDays:30}
});
export type RateClass='AUTH_FAILURE'|'UPLOAD'|'REPORT_EXPORT'|'GRAPH_HEAVY'|'DEFAULT';
export const RATE_LIMITS:Record<RateClass,{max:number;windowMs:number}>={
 AUTH_FAILURE:{max:10,windowMs:60_000},UPLOAD:{max:12,windowMs:60_000},REPORT_EXPORT:{max:10,windowMs:60_000},GRAPH_HEAVY:{max:30,windowMs:60_000},DEFAULT:{max:60,windowMs:60_000}
};
export function classifyRoute(method:string,path:string):RateClass{
 const p=path.toLowerCase();
 if(p.includes('/upload')||p.includes('/verify'))return'UPLOAD';
 if(p.includes('/report')||p.includes('/export'))return'REPORT_EXPORT';
 if(p.includes('/constellation')||p.includes('/graph')||p.includes('/telescope'))return'GRAPH_HEAVY';
 return'DEFAULT';
}
export function unknownOnDependencyFailure(dependency:string,error:unknown){return{state:'UNKNOWN' as const,dependency,reason:error instanceof Error?error.message:'DEPENDENCY_UNAVAILABLE',retryable:true}}
export function boundedBackoff(attempt:number,baseMs=1000,maxMs=3_600_000,jitter=0.2,random=Math.random){if(!Number.isInteger(attempt)||attempt<1)throw Error('INVALID_ATTEMPT');const raw=Math.min(maxMs,baseMs*2**Math.min(attempt-1,20));const delta=raw*jitter;return Math.max(0,Math.round(raw-delta+random()*delta*2))}
export function validateSecurityHeaders(headers:Record<string,string|undefined>){return{
 hsts:/max-age=\d+/.test(headers['strict-transport-security']??''),
 nosniff:(headers['x-content-type-options']??'').toLowerCase()==='nosniff',
 referrer:Boolean(headers['referrer-policy']),
 frame:Boolean(headers['x-frame-options'])||Boolean(headers['content-security-policy']?.includes('frame-ancestors')),
 csp:Boolean(headers['content-security-policy'])
}}
