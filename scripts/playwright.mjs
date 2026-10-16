import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export const {chromium,_electron}=require('playwright');
export const developmentModule=name=>require(name);
