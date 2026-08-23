/* Zera Territorial State Contracts™ v0.1
 * PROBLEM-ZERA-006 → LAW-ZERA-STATE-ESTIMATION-001
 * → HOQ-ZERA-DATA-CONTRACT-001 → SEQ-ZERA-DATA-CONTRACT-001
 *
 * Cette bibliothèque ne gouverne aucune Présence. Elle fige les objets
 * échangés entre l'observation, l'estimation, le chemin et la gouvernance.
 */
(function(root){
  'use strict';
  const VERSION='0.1.0',SCHEMA='ZERA_TERRITORIAL_STATE_CONTRACTS',ZERA_M=.36;
  const TYPES=Object.freeze([
    'NormalizedObservation','TerritorialObservationWindow','ZeraBeliefSet',
    'PathHypothesis','EvidenceBundle','GovernedPresenceState'
  ]);

  function finite(value){const n=Number(value);return Number.isFinite(n)?n:null}
  function text(value){return value==null?null:String(value)}
  function round7(value){const n=finite(value);return n===null?null:Number(n.toFixed(7))}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
  function deepFreeze(value){
    if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
    Object.keys(value).forEach(key=>deepFreeze(value[key]));
    return Object.freeze(value);
  }
  function id(prefix,seed){
    const clean=String(seed||Date.now()).replace(/[^a-zA-Z0-9_-]/g,'');
    return prefix+'-'+clean;
  }
  function envelope(type,producer,objectId,payload){
    return deepFreeze(Object.assign({
      schema:SCHEMA,
      schemaVersion:VERSION,
      type,
      objectId:objectId||id(type.toUpperCase(),Date.now()),
      producedAt:new Date().toISOString(),
      producer:producer||'Cockpit Spatial™ v4.1',
      authority:'CONTRACTUAL_DATA_NOT_GOVERNANCE_DECISION'
    },payload));
  }
  function cellId(anchor){
    const z=anchor&&anchor.zeraCell||{};
    return text(z.cellId||z.zeraId);
  }
  function roadView(anchor){
    const road=anchor&&anchor.road||{};
    return{
      roadId:finite(road.id==null?road.roadId:road.id),
      partIndex:finite(road.partIndex),
      street:text(road.street),
      sMeters:finite(road.chainageFromPartStartM==null?road.chainageFromStartM:road.chainageFromPartStartM),
      crossTrackDistanceM:finite(road.distanceM)
    };
  }
  function normalizedObservation(input){
    input=input||{};
    const raw=input.input||input,point=input.point||raw;
    const samples=Array.isArray(raw.acquisitionSamples)?raw.acquisitionSamples:[];
    const governance=raw.acquisitionGovernance||{};
    return envelope('NormalizedObservation','Observation Normalizer™ v0.1',input.objectId||input.testId,{
      observationId:text(input.observationId||input.testId||input.objectId),
      pointIndex:finite(input.pointIndex),
      capturedAt:text(raw.capturedAt||input.timestamp),
      source:text(raw.source||input.source||'UNKNOWN'),
      coordinate:{lat:round7(point.lat),lon:round7(point.lon),decimals:7},
      accuracyM:finite(raw.accuracyM==null?input.accuracy:raw.accuracyM),
      acquisition:{
        status:text(governance.status||'NOT_GOVERNED'),
        validationAuthorized:Boolean(governance.validationAuthorized),
        sampleCount:finite(governance.sampleCount)==null?samples.length:finite(governance.sampleCount),
        medianSpreadM:finite(governance.medianSpreadM),
        samples:samples.map((sample,index)=>({index:index+1,lat:round7(sample.lat),lon:round7(sample.lon),accuracyM:finite(sample.accuracyM),capturedAt:text(sample.capturedAt)}))
      },
      motion:clone(input.motion||raw.motion||{status:'NOT_AVAILABLE'}),
      googleOptional:true,
      governanceAuthority:false
    });
  }
  function territorialObservationWindow(input){
    input=input||{};
    const anchor=input.territorialAnchor||input.anchor||{},continuity=input.zeraContinuityGovernance||input.continuity||{};
    const local=continuity.localWindow||{},ranked=Array.isArray(local.ranked)?local.ranked:[];
    let cells=ranked.map(item=>({
      zeraId:text(item.zeraId),index:finite(item.index),deltaFromGoverned:finite(item.delta),
      medianDistanceM:finite(item.medianDistanceM),minimumDistanceM:finite(item.minimumDistanceM),admitted:true
    }));
    if(!cells.length&&cellId(anchor))cells=[{zeraId:cellId(anchor),index:finite(anchor.zeraCell&&anchor.zeraCell.indexFromCanonicalPartStart),deltaFromGoverned:0,medianDistanceM:null,minimumDistanceM:null,admitted:true}];
    return envelope('TerritorialObservationWindow','Street Corridor Resolver™ v0.1',input.objectId||input.testId,{
      observationId:text(input.observationId||input.testId),
      governedOriginZeraId:text(continuity.retainedCellId||input.governedOriginZeraId),
      road:roadView(anchor),
      mode:text(input.mode||(cells.length>3?'MOVEMENT_MODE':'STABLE_MODE')),
      candidateCells:cells,
      qedimahAdmissionRequired:true,
      outsideQedimahForbidden:true
    });
  }
  function candidateSupport(candidates){
    if(!candidates.length)return[];
    const supplied=candidates.every(candidate=>finite(candidate.support)!==null);
    if(supplied){
      const total=candidates.reduce((sum,candidate)=>sum+Math.max(0,finite(candidate.support)||0),0)||1;
      return candidates.map((candidate,index)=>Object.assign({},candidate,{
        rank:index+1,
        support:Number((Math.max(0,finite(candidate.support)||0)/total).toFixed(6)),
        supportNature:text(candidate.supportNature||'RELATIVE_HEURISTIC_NOT_CALIBRATED_PROBABILITY')
      }));
    }
    const weights=candidates.map(candidate=>{
      const d=finite(candidate.medianDistanceM);
      return d===null?1:1/(Math.max(0,d)+.36);
    });
    const total=weights.reduce((sum,value)=>sum+value,0)||1;
    return candidates.map((candidate,index)=>Object.assign({},candidate,{
      rank:index+1,
      support:Number((weights[index]/total).toFixed(6)),
      supportNature:'RELATIVE_HEURISTIC_NOT_CALIBRATED_PROBABILITY'
    }));
  }
  function zeraBeliefSet(input){
    input=input||{};
    const windowObject=input.window||input.territorialObservationWindow||{};
    const sourceCandidates=Array.isArray(input.candidates)?input.candidates:(Array.isArray(windowObject.candidateCells)?windowObject.candidateCells:[]);
    const candidates=candidateSupport(sourceCandidates);
    return envelope('ZeraBeliefSet','Zera Territorial State Estimator™ v0.1',input.objectId||input.testId,{
      observationId:text(input.observationId||input.testId||windowObject.observationId),
      governedOriginZeraId:text(input.governedOriginZeraId||windowObject.governedOriginZeraId),
      candidates,
      estimatedZeraId:candidates[0]&&candidates[0].zeraId||null,
      rangeZeraIds:candidates.map(candidate=>candidate.zeraId),
      scoreSemantics:'RELATIVE_SUPPORT_ONLY',
      normalization:candidates.length?'SUM_EQUALS_ONE':'EMPTY_SET',
      promotionAuthority:false
    });
  }
  function pathHypothesis(input){
    input=input||{};
    const pathGovernance=input.zeraPathGovernance||input.pathGovernance||{},path=pathGovernance.path||{};
    return envelope('PathHypothesis','Zera Governed Path Resolver™ v0.1',input.objectId||input.testId,{
      observationId:text(input.observationId||input.testId),
      originZeraId:text(pathGovernance.originZeraId),
      destinationCandidateZeraId:text(pathGovernance.destinationCandidateZeraId),
      cells:Array.isArray(path.cells)?path.cells.map(text):[],
      transitionCount:finite(path.transitionCount),
      direction:text(path.direction||'UNKNOWN'),
      status:text(pathGovernance.status||path.status||'PATH_NOT_EVALUATED'),
      decision:text(pathGovernance.decision||'HOLD'),
      traversalProven:pathGovernance.status==='PATH_VALIDATED',
      governedMovement:clone(pathGovernance.governedMovement||{distanceZera:0,distanceM:0})
    });
  }
  function evidenceBundle(input){
    input=input||{};
    const path=input.zeraPathGovernance||input.pathGovernance||{},continuity=input.zeraContinuityGovernance||input.continuity||{};
    const pathFamilies=path.evidence&&Array.isArray(path.evidence.families)?path.evidence.families:[];
    const continuityWitnesses=continuity.witnessGovernance&&Array.isArray(continuity.witnessGovernance.witnesses)?continuity.witnessGovernance.witnesses:[];
    const seen={},families=[];
    pathFamilies.concat(continuityWitnesses).forEach(item=>{
      const key=text(item.family||item.independentFamily||item.id)||'UNKNOWN';
      if(seen[key])return;
      seen[key]=true;
      families.push({id:text(item.id),family:key,supports:Boolean(item.supports),level:text(item.level),provenance:text(item.provenance||item.id)});
    });
    const supporting=families.filter(item=>item.supports);
    return envelope('EvidenceBundle','Evidence Fusion Governance™ v0.1',input.objectId||input.testId,{
      observationId:text(input.observationId||input.testId),
      families,
      supportingFamilyCount:supporting.length,
      requiredIndependentFamilies:2,
      hasCalibratedFieldWitness:Boolean(path.evidence&&path.evidence.fieldValid),
      sufficientForGovernance:path.status==='PATH_VALIDATED',
      omehNeverSoleAuthority:true
    });
  }
  function governedPresenceState(input){
    input=input||{};
    const belief=input.zeraBeliefSet||input.beliefSet||{},hypothesis=input.pathHypothesis||{},evidence=input.evidenceBundle||{};
    const path=input.zeraPathGovernance||input.pathGovernance||{},continuity=input.zeraContinuityGovernance||input.continuity||{};
    const governed=text(path.retainedCellId||continuity.retainedCellId||belief.governedOriginZeraId);
    const validated=path.status==='PATH_VALIDATED'&&evidence.sufficientForGovernance===true;
    const candidates=Array.isArray(belief.candidates)?belief.candidates:[];
    return envelope('GovernedPresenceState','Presence and Movement Governance™ v0.1',input.objectId||input.testId,{
      observationId:text(input.observationId||input.testId),
      governedZeraId:governed,
      estimatedZeraId:text(belief.estimatedZeraId),
      positionRangeZeraIds:Array.isArray(belief.rangeZeraIds)?belief.rangeZeraIds.slice():[],
      confidence:candidates[0]&&finite(candidates[0].support),
      confidenceNature:'RELATIVE_HEURISTIC_NOT_SURVEY_ACCURACY',
      pathStatus:text(path.status||hypothesis.status||'PATH_NOT_EVALUATED'),
      decision:text(path.decision||continuity.decision||'HOLD'),
      governedMovement:clone(validated?path.governedMovement:(continuity.governedMovement||{distanceZera:0,distanceM:0})),
      presenceStatus:validated?'PRESENCE_GOVERNED_AT_DESTINATION':governed?'PRESENCE_MAINTAINED':'PRESENCE_UNRESOLVED',
      resourceActivation:validated?'EVALUATE_DAVAR_POLICY':'HOLD_NEW_RESOURCE_ACTIVATION'
    });
  }
  function validate(object,expectedType){
    const errors=[];
    if(!object||typeof object!=='object')return{valid:false,type:expectedType||null,errors:['OBJECT_REQUIRED']};
    if(object.schema!==SCHEMA)errors.push('SCHEMA_INVALID');
    if(object.schemaVersion!==VERSION)errors.push('SCHEMA_VERSION_INVALID');
    if(TYPES.indexOf(object.type)<0)errors.push('TYPE_INVALID');
    if(expectedType&&object.type!==expectedType)errors.push('EXPECTED_TYPE_'+expectedType);
    if(!object.objectId)errors.push('OBJECT_ID_REQUIRED');
    if(object.type==='NormalizedObservation'&&(finite(object.coordinate&&object.coordinate.lat)===null||finite(object.coordinate&&object.coordinate.lon)===null))errors.push('COORDINATE_REQUIRED');
    if(object.type==='TerritorialObservationWindow'&&!Array.isArray(object.candidateCells))errors.push('CANDIDATE_CELLS_REQUIRED');
    if(object.type==='ZeraBeliefSet'&&!Array.isArray(object.candidates))errors.push('BELIEF_CANDIDATES_REQUIRED');
    if(object.type==='PathHypothesis'&&!Array.isArray(object.cells))errors.push('PATH_CELLS_REQUIRED');
    if(object.type==='EvidenceBundle'&&!Array.isArray(object.families))errors.push('EVIDENCE_FAMILIES_REQUIRED');
    if(object.type==='GovernedPresenceState'&&!('governedZeraId' in object))errors.push('GOVERNED_ZERA_FIELD_REQUIRED');
    return{valid:errors.length===0,type:object.type||null,errors,status:errors.length?'CONTRACT_INVALID':'CONTRACT_VALID'};
  }
  function compose(input){
    input=input||{};
    const normalized=normalizedObservation(input);
    const windowObject=territorialObservationWindow(input);
    const belief=zeraBeliefSet({testId:input.testId,observationId:normalized.observationId,window:windowObject,governedOriginZeraId:windowObject.governedOriginZeraId});
    const hypothesis=pathHypothesis(input);
    const evidence=evidenceBundle(input);
    const state=governedPresenceState(Object.assign({},input,{zeraBeliefSet:belief,pathHypothesis:hypothesis,evidenceBundle:evidence}));
    const objects={normalizedObservation:normalized,territorialObservationWindow:windowObject,zeraBeliefSet:belief,pathHypothesis:hypothesis,evidenceBundle:evidence,governedPresenceState:state};
    const validations=Object.keys(objects).reduce((out,key)=>{out[key]=validate(objects[key]);return out;},{});
    return deepFreeze({schema:SCHEMA,schemaVersion:VERSION,status:Object.values(validations).every(item=>item.valid)?'CONTRACT_CHAIN_VALID':'CONTRACT_CHAIN_INVALID',objects,validations});
  }

  root.ZeraTerritorialStateContracts=Object.freeze({
    version:VERSION,schema:SCHEMA,types:TYPES,metersPerZera:ZERA_M,
    normalizedObservation,territorialObservationWindow,zeraBeliefSet,
    pathHypothesis,evidenceBundle,governedPresenceState,compose,validate
  });
})(typeof window!=='undefined'?window:globalThis);
