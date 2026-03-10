// backend/ia/conversationLearning.js

const LEARNING = [];

export function storeConversationSample(user,reply){

  LEARNING.push({
    user,
    reply,
    timestamp: Date.now()
  });

}

export function getSimilarReply(message){

  const t = message.toLowerCase();

  for(const item of LEARNING){

    if(t.includes(item.user)){
      return item.reply;
    }

  }

  return null;

}