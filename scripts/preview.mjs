import {serve} from './server.mjs';
const server=await serve(Number(process.env.PORT || 4173));
console.log(`Open Meadow browser compatibility fixture (not Desktop): ${server.url}`);
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{await server.close();process.exit(0);});
