import {computed,onBeforeUnmount,ref,watch} from 'vue'
import {clampNodePosition} from './agentGraph.mjs'

// Positions are presentation preferences only; never modify a saved analysis.
export function useGraphDrag(scope,onInteract=()=>{}) {
  const positions=ref({}),dragging=ref('')
  let gesture=null,suppressed=null
  const storageKey=computed(()=>`mmaofun:agent-layout:${scope.value}`)
  function save(){try{localStorage.setItem(storageKey.value,JSON.stringify(positions.value))}catch{}}
  function restore(){
    const next={}
    try{for(const [id,point] of Object.entries(JSON.parse(localStorage.getItem(storageKey.value)||'{}')))
      if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y))next[id]=clampNodePosition(point)}catch{}
    positions.value=next
  }
  function svgPoint(event,svg){
    const matrix=svg.getScreenCTM()
    if(!matrix)return null
    return new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse())
  }
  function startDrag(event,node){
    if(event.button!==0||event.isPrimary===false)return
    const element=event.currentTarget,svg=element.ownerSVGElement,point=svgPoint(event,svg)
    if(!point)return
    suppressed=null
    gesture={id:node.id,pointer:event.pointerId,element,svg,point,x:node.x,y:node.y,
      clientX:event.clientX,clientY:event.clientY,previous:positions.value[node.id],moved:false}
    element.setPointerCapture(event.pointerId)
  }
  function moveDrag(event){
    if(!gesture||gesture.pointer!==event.pointerId)return
    const point=svgPoint(event,gesture.svg)
    if(!point)return
    if(!gesture.moved&&Math.hypot(event.clientX-gesture.clientX,event.clientY-gesture.clientY)<5)return
    if(!gesture.moved){gesture.moved=true;dragging.value=gesture.id;onInteract()}
    event.preventDefault()
    positions.value={...positions.value,[gesture.id]:clampNodePosition({x:gesture.x+point.x-gesture.point.x,y:gesture.y+point.y-gesture.point.y})}
  }
  function finishDrag(event,cancel=false,onTap){
    if(!gesture||event&&event.pointerId!==gesture.pointer)return
    const last=gesture;gesture=null;dragging.value=''
    if(last.moved){
      suppressed={id:last.id,until:Date.now()+500}
      if(cancel){const next={...positions.value};if(last.previous)next[last.id]=last.previous;else delete next[last.id];positions.value=next}
      else save()
    }
    if(last.element.hasPointerCapture(last.pointer))last.element.releasePointerCapture(last.pointer)
    // SVG touch-action is not honored consistently. Node touchstart prevents
    // scrolling, so activate intentional taps here and suppress a duplicate click.
    if(!last.moved&&!cancel&&event?.pointerType==='touch'&&onTap){
      suppressed={id:last.id,until:Date.now()+500};onTap(last.id)
    }
  }
  function activate(event,node,select){
    if(suppressed?.id===node.id&&Date.now()<suppressed.until){suppressed=null;return}
    select(node.id)
  }
  function nudge(event,node){
    const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},delta=moves[event.key]
    if(!delta)return
    event.preventDefault();onInteract()
    const step=event.shiftKey?30:10
    positions.value={...positions.value,[node.id]:clampNodePosition({x:node.x+delta[0]*step,y:node.y+delta[1]*step})}
    save()
  }
  function resetPositions(){finishDrag(null,true);positions.value={};try{localStorage.removeItem(storageKey.value)}catch{}}
  watch(scope,()=>{finishDrag(null,true);suppressed=null;restore()},{immediate:true})
  onBeforeUnmount(()=>finishDrag(null,true))
  return {positions,dragging,startDrag,moveDrag,finishDrag,activate,nudge,resetPositions}
}
