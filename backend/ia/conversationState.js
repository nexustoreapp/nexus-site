// backend/ia/conversationState.js

const STATE = new Map();

export function getConversationState(id){

  if(!STATE.has(id)){

    STATE.set(id,{
      stage:"discovery",
      budget:null,
      use:null,
      intent:null
    });

  }

  return STATE.get(id);

}

export function updateConversationState(id,data){

  const state = getConversationState(id);

  if(data.budget){
    state.budget = data.budget;
  }

  if(data.use){
    state.use = data.use;
  }

  if(data.intent){
    state.intent = data.intent;
  }

  /* ===============================
STAGE DETECTION
=============================== */

  if(state.budget && state.use){
    state.stage = "recommendation";
  }

  if(!state.budget){
    state.stage = "ask_budget";
  }

  if(state.budget && !state.use){
    state.stage = "ask_use";
  }

  STATE.set(id,state);

  return state;

}