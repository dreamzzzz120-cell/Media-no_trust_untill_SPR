import{WebhookDeliveryStore,deliverClaimed,defaultDeliveryPolicy}from'./webhook-delivery.js';
const url=process.env.WORKER_DATABASE_URL??process.env.APP_DATABASE_URL??process.env.DATABASE_URL;if(!url)throw Error('WORKER_DATABASE_URL or APP_DATABASE_URL is required');
const store=new WebhookDeliveryStore(url);const batch=Math.max(1,Math.min(100,Number(process.env.WEBHOOK_BATCH_SIZE||25)));
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let stop=false;process.on('SIGTERM',()=>{stop=true});process.on('SIGINT',()=>{stop=true});
try{while(!stop){let work=0;for(const org of await store.tenantIds()){const claim=await store.claim(org,batch,defaultDeliveryPolicy.leaseMs);if(!claim.rows.length)continue;work+=claim.rows.length;await deliverClaimed(store,claim)}if(!work)await sleep(1000)}}finally{await store.close()}
