import{databaseUrlForRole}from'./database-role.js';import{WebhookDeliveryStore,deliverClaimed,defaultDeliveryPolicy}from'./webhook-delivery.js';
const base=process.env.WORKER_DATABASE_URL??process.env.DATABASE_URL;if(!base)throw Error('WORKER_DATABASE_URL or DATABASE_URL is required');const url=databaseUrlForRole(base,'constellation_worker_runtime');
const store=new WebhookDeliveryStore(url);const batch=Math.max(1,Math.min(100,Number(process.env.WEBHOOK_BATCH_SIZE||25)));
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let stop=false;process.on('SIGTERM',()=>{stop=true});process.on('SIGINT',()=>{stop=true});
try{while(!stop){const claim=await store.claim(batch,defaultDeliveryPolicy.leaseMs);if(!claim.rows.length){await sleep(1000);continue}await deliverClaimed(store,claim)}}finally{await store.close()}
