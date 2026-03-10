// backend/ia/behavioralSignals.js

const SIGNALS = {
views:{},
scrollDepth:{},
timeOnPage:{},
repeatedSearch:{}
};

export function registerView(productId){

if(!productId) return;

if(!SIGNALS.views[productId]){
SIGNALS.views[productId]=0;
}

SIGNALS.views[productId]++;

}

export function registerScroll(depth){

if(!depth) return;

const key = Math.floor(depth/25)*25;

if(!SIGNALS.scrollDepth[key]){
SIGNALS.scrollDepth[key]=0;
}

SIGNALS.scrollDepth[key]++;

}

export function registerTime(seconds){

if(!seconds) return;

const bucket = Math.floor(seconds/10)*10;

if(!SIGNALS.timeOnPage[bucket]){
SIGNALS.timeOnPage[bucket]=0;
}

SIGNALS.timeOnPage[bucket]++;

}

export function registerSearch(query){

if(!query) return;

const q = query.toLowerCase();

if(!SIGNALS.repeatedSearch[q]){
SIGNALS.repeatedSearch[q]=0;
}

SIGNALS.repeatedSearch[q]++;

}

export function getBehaviorInsights(){

return SIGNALS;

}