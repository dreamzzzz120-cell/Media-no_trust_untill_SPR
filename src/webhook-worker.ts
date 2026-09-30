import{WebhookDeliveryStore,deliverClaimed,defaultDeliveryPolicy}from'./webhook-delivery.js';
const url=process.env.DATABASE_URL;if(!url)throw Error('DATABASE_URL is required');
const store=new WebhookDeliveryStore(url);const batch=Math.max(1,Math.min(100,Number(process.env.WEBHOOK_BATCH_SIZE||25)));
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let stop=false;process.on('SIGTERM',()=>{stop=true});process.on('SIGINT',()=>{stop=true});
try{while(!stop){const claim=await store.claim(batch,defaultDeliveryPolicy.leaseMs);if(!claim.rows.length){await sleep(1000);continue}await deliverClaimed(store,claim)}}finally{await store.close()}
