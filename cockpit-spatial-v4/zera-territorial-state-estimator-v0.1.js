/* Zera Territorial State Estimator™ v0.1
 * PROBLEM-ZERA-007 → LAW-ZERA-STATE-ESTIMATION-001
 * → HOQ-ZERA-BELIEF-001 → SEQ-ZERA-TERRITORIAL-STATE-001
 *
 * Estimateur parallèle : il observe et classe. Il ne modifie jamais la
 * position gouvernée par les résolveurs existants.
 */
(function(root){
  'use strict';
  const VERSION='0.1.0',ZERA_M=.36,EARTH_R=6371008.8;

  function finite(value){const n=Number(value);return Number.isFinite(n)?n:null}
  function text(value){return value==null?null:String(value)}
  function freeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.keys(value).forEach(key=>freeze(value[key]));return Object.freeze(value);
  }
  function median(values){
    const clean=values.filter(value=>finite(value)!==null).map(Number).sort((a,b)=>a-b);
    if(!clean.length)return null;const middle=Math.floor(clean.length/2);
    return clean.length%2?clean[middle]:(clean[middle-1]+clean[middle])/2;
  }
  function distanceM(a,b){
    if(!a||!b)return null;const lat1=finite(a.lat),lon1=finite(a.lon),lat2=finite(b.lat),lon2=finite(b.lon);
    if([lat1,lon1,lat2,lon2].some(value=>value===null))return null;
    const rad=Math.PI/180,dLat=(lat2-lat1)*rad,dLon=(lon2-lon1)*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
    return 2*EARTH_R*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function parseZeraId(zeraId){
    const match=String(zeraId||'').match(/\.R(\d+)\.P(\d+)\.Z(\d+)$/);
    return match?{roadId:Number(match[1]),partIndex:Number(match[2]),index:Number(match[3])}:null;
  }
  function fixedCell(registry,origin,index){
    if(!registry||!origin||typeof registry.getCell!=='function'||index<0)return null;
    try{return registry.getCell({roadId:origin.roadId,partIndex:origin.partIndex,index,withAnchors:false})||null}catch(error){return null}
  }
  function sourceSamples(normalized){
    const samples=normalized&&normalized.acquisition&&Array.isArray(normalized.acquisition.samples)?normalized.acquisition.samples:[];
    const valid=samples.filter(sample=>finite(sample.lat)!==null&&finite(sample.lon)!==null);
    return valid.length?valid:[normalized.coordinate];
  }
  function motionMode(input){
    const motion=input.motion||(input.input&&input.input.motion)||{};
    if(motion.detected===false||motion.status==='STILL'||motion.status==='IMMOBILE')return'STABLE_MODE';
    if(motion.detected===true||motion.status==='MOVING')return'MOVEMENT_MODE';
    return'UNKNOWN_MODE';
  }
  function elapsedSeconds(input,previous){
    const current=Date.parse(input.timestamp||(input.input&&input.input.capturedAt)||'');
    const prior=Date.parse(previous&&previous.timestamp||'');
    return Number.isFinite(current)&&Number.isFinite(prior)?Math.max(0,(current-prior)/1000):0;
  }
  function radiusFor(mode,elapsed){
    if(mode==='STABLE_MODE')return 1;
    if(mode==='MOVEMENT_MODE')return Math.max(2,Math.min(25,Math.ceil((Math.max(elapsed,1)*2)/ZERA_M)));
    return 3;
  }
  function previousSupport(previous){
    const estimator=previous&&previous.territorialStateEstimation||{};
    const belief=estimator.zeraBeliefSet||(estimator.contractChain&&estimator.contractChain.objects&&estimator.contractChain.objects.zeraBeliefSet)||{};
    return (Array.isArray(belief.candidates)?belief.candidates:[]).reduce((map,candidate)=>{map[candidate.zeraId]=finite(candidate.support)||0;return map},{});
  }
  function pathCells(registry,origin,destinationIndex){
    const step=destinationIndex>=origin.index?1:-1,cells=[];
    for(let index=origin.index;;index+=step){
      const cell=fixedCell(registry,origin,index);if(!cell)return[];
      cells.push(cell.zeraId||cell.cellId);if(index===destinationIndex)break;
    }
    return cells;
  }
  function estimate(input){
    input=input||{};
    const contracts=root.ZeraTerritorialStateContracts,registry=root.ZeraFixedCoordinateRegistry,hsc=root.ZeraHSCSequenceRegistry&&root.ZeraHSCSequenceRegistry.stateEstimatorContract;
    if(!contracts||!registry)return freeze({engine:'Zera Territorial State Estimator™',version:VERSION,status:'DEPENDENCY_UNAVAILABLE',missing:[!contracts?'ZeraTerritorialStateContracts':null,!registry?'ZeraFixedCoordinateRegistry':null].filter(Boolean),governanceMutation:false});
    const normalized=contracts.normalizedObservation(input),previous=input.previousObservation||null;
    const continuity=input.zeraContinuityGovernance||{},anchor=input.territorialAnchor||{};
    const anchorId=anchor.zeraCell&&(anchor.zeraCell.cellId||anchor.zeraCell.zeraId);
    const governedId=text(continuity.retainedCellId||(previous&&previous.zeraContinuityGovernance&&previous.zeraContinuityGovernance.retainedCellId)||anchorId);
    const origin=parseZeraId(governedId)||parseZeraId(anchorId);
    if(!origin)return freeze({engine:'Zera Territorial State Estimator™',version:VERSION,status:'GOVERNED_ORIGIN_UNAVAILABLE',governanceMutation:false,normalizedObservation:normalized});
    const mode=motionMode(input),elapsed=elapsedSeconds(input,previous),radius=radiusFor(mode,elapsed),samples=sourceSamples(normalized),prior=previousSupport(previous);
    const cells=[];
    for(let index=Math.max(0,origin.index-radius);index<=origin.index+radius;index++){
      const cell=fixedCell(registry,origin,index);if(!cell)continue;
      const center=cell.fixedCoordinate&&cell.fixedCoordinate.center||cell.coordinate||{};
      const distances=samples.map(sample=>distanceM(sample,center)).filter(value=>value!==null);
      const medianM=median(distances),fixedLikelihood=medianM===null?0:Math.exp(-medianM/Math.max(ZERA_M,normalized.accuracyM||8));
      const temporalPrior=prior[cell.zeraId]||prior[cell.cellId]||0;
      const continuityPrior=1/(1+Math.abs(index-origin.index));
      const raw=.68*fixedLikelihood+.20*continuityPrior+.12*temporalPrior;
      cells.push({zeraId:cell.zeraId||cell.cellId,index,deltaFromGoverned:index-origin.index,medianDistanceM:medianM,minimumDistanceM:distances.length?Math.min.apply(null,distances):null,admitted:true,support:raw,evidence:{fixedCoordinateLikelihood:Number(fixedLikelihood.toFixed(6)),temporalPrior:Number(temporalPrior.toFixed(6)),continuityPrior:Number(continuityPrior.toFixed(6)),qedimahAdmission:true}});
    }
    cells.sort((a,b)=>b.support-a.support||Math.abs(a.deltaFromGoverned)-Math.abs(b.deltaFromGoverned));
    const windowObject=contracts.territorialObservationWindow(Object.assign({},input,{mode,governedOriginZeraId:governedId,zeraContinuityGovernance:Object.assign({},continuity,{retainedCellId:governedId,localWindow:{ranked:cells}})}));
    const belief=contracts.zeraBeliefSet({testId:input.testId,observationId:normalized.observationId,window:windowObject,governedOriginZeraId:governedId,candidates:cells});
    const hypotheses=belief.candidates.slice(0,3).map((candidate,rank)=>{
      const path=pathCells(registry,origin,candidate.index),transitionCount=Math.abs(candidate.index-origin.index);
      return contracts.pathHypothesis({testId:(input.testId||'OBS')+'-H'+rank,observationId:normalized.observationId,pathGovernance:{originZeraId:governedId,destinationCandidateZeraId:candidate.zeraId,status:'PATH_CANDIDATE',decision:'OBSERVE_ONLY',path:{cells:path,transitionCount,direction:candidate.index===origin.index?'STABLE':candidate.index>origin.index?'FORWARD':'BACKWARD'},governedMovement:{distanceZera:0,distanceM:0}}});
    });
    const evidence=contracts.evidenceBundle(input);
    const existingState=contracts.governedPresenceState(Object.assign({},input,{zeraBeliefSet:belief,pathHypothesis:hypotheses[0],evidenceBundle:evidence}));
    const state=freeze(Object.assign({},existingState,{estimatedZeraId:belief.estimatedZeraId,positionRangeZeraIds:belief.candidates.slice(0,3).map(candidate=>candidate.zeraId),decision:'OBSERVE_PARALLEL_NO_GOVERNANCE_MUTATION',governedZeraId:governedId,governanceMutation:false}));
    const objects={normalizedObservation:normalized,territorialObservationWindow:windowObject,zeraBeliefSet:belief,pathHypothesis:hypotheses[0],evidenceBundle:evidence,governedPresenceState:state};
    const validations=Object.keys(objects).reduce((out,key)=>{out[key]=contracts.validate(objects[key]);return out},{});
    const observedAnchor=parseZeraId(anchorId),outside=observedAnchor&&Math.abs(observedAnchor.index-origin.index)>radius?{zeraId:anchorId,index:observedAnchor.index,reason:'OUTSIDE_DYNAMIC_QEDIMAH_WINDOW_EXCLUDED_BEFORE_BELIEF'}:null;
    return freeze({engine:'Zera Territorial State Estimator™',version:VERSION,status:Object.values(validations).every(item=>item.valid)?'PARALLEL_ESTIMATE_READY':'CONTRACT_CHAIN_INVALID',authority:'OBSERVATIONAL_ONLY',governanceMutation:false,hsc:{problemId:hsc&&hsc.problem_id,lawId:hsc&&hsc.law_id,hoqId:hsc&&hsc.hoq_id,sequenceId:hsc&&hsc.sequence_id,executionId:hsc&&hsc.execution_id,authorizationTokenIssued:Boolean(hsc&&hsc.authorization_token)},mode,dynamicWindow:{radiusZera:radius,elapsedSeconds:elapsed,maxWalkingSpeedMps:2,originZeraId:governedId,excludedObservationCandidate:outside},normalizedObservation:normalized,territorialObservationWindow:windowObject,zeraBeliefSet:belief,pathHypotheses:hypotheses,evidenceBundle:evidence,governedPresenceState:state,contractChain:{schema:contracts.schema,schemaVersion:contracts.version,status:'CONTRACT_CHAIN_VALID',objects,validations}});
  }
  root.ZeraTerritorialStateEstimator=Object.freeze({version:VERSION,metersPerZera:ZERA_M,estimate,distanceM,parseZeraId});
})(typeof window!=='undefined'?window:globalThis);
