import {watch} from 'vue'
// External portfolio/filter changes update the reading selection without re-emitting
// a node action or starting replay. Initial mount keeps the all-conversation feed.
export function watchParticipantSelection(source,focus,hold){return watch(source,selected=>{if(selected===undefined||selected===focus.value)return;hold();focus.value=selected||''})}
