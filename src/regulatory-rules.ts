export type RuleStatus = 'ACTIVE' | 'PROPOSED' | 'GUIDANCE';
export interface RegulatoryRule { id:string; jurisdiction:string; citation:string; status:RuleStatus; effectiveFrom:string | null; controls:string[]; source:string; }
export const REGULATORY_RULES:RegulatoryRule[]=[
{id:'EU_ARTICLE_50',jurisdiction:'EU',citation:'Regulation (EU) 2024/1689 Article 50',status:'ACTIVE',effectiveFrom:'2026-08-02',controls:['machine_readable_ai_marking','deepfake_disclosure','public_interest_text_disclosure','accessibility'],source:'EUR-Lex CELEX 02024R1689'},
{id:'CANADA_ELECTIONS_480_1',jurisdiction:'CA',citation:'Canada Elections Act s. 480.1',status:'ACTIVE',effectiveFrom:'2026-06-18',controls:['election_impersonation_review','synthetic_image_review','synthetic_voice_review','intent_to_mislead_context','parody_satire_exception'],source:'Justice Laws Canada'},
{id:'CANADA_ELECTIONS_481',jurisdiction:'CA',citation:'Canada Elections Act s. 481',status:'ACTIVE',effectiveFrom:'2026-06-18',controls:['misleading_publication_review','authorization_evidence','identity_voice_image_evidence','parody_satire_exception'],source:'Justice Laws Canada'}
];
export const activeRules=(jurisdiction:string,at=new Date())=>REGULATORY_RULES.filter(r=>r.jurisdiction===jurisdiction&&r.status==='ACTIVE'&&(!r.effectiveFrom||new Date(r.effectiveFrom+'T00:00:00Z')<=at));
