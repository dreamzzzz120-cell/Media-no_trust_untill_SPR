export interface ActionAuthorityPolicy{minimumClass:number;requiredEndorsements:readonly string[]}
const POLICIES:Readonly<Record<string,ActionAuthorityPolicy>>=Object.freeze({
 OBSERVE:{minimumClass:0,requiredEndorsements:[]},
 RECOMMEND:{minimumClass:1,requiredEndorsements:[]},
 COMMUNICATE:{minimumClass:2,requiredEndorsements:['EXT']},
 ACT:{minimumClass:3,requiredEndorsements:[]},
 TRANSACT:{minimumClass:4,requiredEndorsements:['FIN']},
 CONTROL_PRODUCTION:{minimumClass:5,requiredEndorsements:['PROD']},
 DELEGATE:{minimumClass:6,requiredEndorsements:['DEL']},
 AUTONOMOUS_WORKFLOW:{minimumClass:7,requiredEndorsements:[]}
});
export function actionAuthorityPolicy(actionType:string):ActionAuthorityPolicy|null{return POLICIES[actionType]??null}
