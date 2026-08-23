/* Zera Earthbound Continuity Governance™ v0.2
 * Exécute SEQ-ZERA-EARTHBOUND-001. Le candidat global reste auditable,
 * mais seules Zn-1, Zn et Zn+1 entrent dans la gouvernance.
 */
(function(root){
  'use strict';
  const VERSION='0.2.0',ZERA_M=.36,MIN_WITNESSES=2;
  function n(v){v=Number(v);return Number.isFinite(v)?v:null}
  function median(a){if(!a.length)return null;a=a.slice().sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  function sampleRows(input){return(Array.isArray(input.samples)?input.samples:[]).map((s,i)=>({i,lat:n(s.lat==null?s.latitude:s.lat),lon:n(s.lon==null?s.longitude:s.lon)})).filter(s=>s.lat!==null&&s.lon!==null)}
  function pointNumber(o,f){const v=n(o&&o.pointIndex);return v===null?f:v}
  function retainedReference(previous,fallback){
    const id=previous&&previous.zeraContinuityGovernance&&previous.zeraContinuityGovernance.retainedCellId,m=id&&String(id).match(/\.R(\d+)\.P(\d+)\.Z(\d+)$/);
    return m?{roadId:Number(m[1]),partIndex:Number(m[2]),index:Number(m[3]),cellId:id}:fallback;
  }
  function omehScore(current,previous,roadName){
    if(!current||current.status!=='STREET_PRESENCE_OBSERVED')return{score:0,level:'NOT_AVAILABLE',streetAgreement:false,streetContinuity:false,addressContextContinuity:false,role:'CONTRIBUTIVE_WITNESS_NEVER_SOLE_AUTHORITY'};
    const cs=current&&current.observedStreet||{},ca=current&&current.nearestPadaAddress||{},ps=previous&&previous.observedStreet||{},pa=previous&&previous.nearestPadaAddress||{};
    const streetAgreement=Boolean(cs.street&&roadName&&cs.street===roadName);
    const continuity=Boolean(!ps.street||ps.street===cs.street);
    const addressContinuity=Boolean(!pa.id||pa.id===ca.id||pa.street===ca.street);
    const score=(streetAgreement?45:0)+(continuity?30:0)+(addressContinuity?25:0);
    return{score,level:score>=80?'HIGH':score>=55?'MEDIUM':'LOW',streetAgreement,streetContinuity:continuity,addressContextContinuity:addressContinuity,role:'CONTRIBUTIVE_WITNESS_NEVER_SOLE_AUTHORITY'};
  }
  function localRank(registry,priorCell,samples){
    const cells=[];
    for(const delta of [-1,0,1]){const cell=registry.getCell({roadId:priorCell.roadId,partIndex:priorCell.partIndex,index:priorCell.index+delta,withAnchors:false});if(cell&&cell.index===priorCell.index+delta)cells.push({delta,cell})}
    const utm=samples.map(s=>registry.wgs84ToUtm30(s.lat,s.lon));
    const ranked=cells.map(row=>{const distances=utm.map(p=>Math.hypot(p.x-row.cell.utmCoordinate.center.x,p.y-row.cell.utmCoordinate.center.y));return{delta:row.delta,zeraId:row.cell.zeraId,index:row.cell.index,medianDistanceM:median(distances),minimumDistanceM:distances.length?Math.min.apply(null,distances):null,sampleDistances:distances}}).sort((a,b)=>a.medianDistanceM-b.medianDistanceM);
    const best=ranked[0]||null,second=ranked[1]||null;
    return{eligibleCells:cells.map(x=>x.cell.zeraId),ranked,best,marginM:best&&second?second.medianDistanceM-best.medianDistanceM:null};
  }
  function resolve(input){
    const registry=root.ZeraFixedCoordinateRegistry,hsc=root.ZeraHSCSequenceRegistry,contract=hsc&&hsc.contract,validation=hsc&&hsc.validate(contract);
    const current=input&&input.currentAnchor||{},previous=input&&input.previousObservation||null,acquisition=input&&input.acquisitionGovernance||{},source=String(input&&input.source||'gps').toLowerCase(),samples=sampleRows(input||{}),point=pointNumber(input&&input.currentObservation,null);
    const common={engine:'Zera Earthbound Continuity Governance™',version:VERSION,problemId:contract&&contract.problem_id,lawId:contract&&contract.law_id,hoqId:contract&&contract.hoq_id,sequenceId:contract&&contract.sequence_id,executionId:contract&&contract.execution_id,hscContractStatus:validation&&validation.status,authorizationTokenIssued:Boolean(validation&&validation.authorized),sequence:['ACQUIRE','AUTHORIZE','CONFIRM_STREET','OPEN_P0','OPEN_LOCAL_WINDOW','EVALUATE_WITNESSES','MANIFEST_OR_MAINTAIN']};
    if(!validation||!validation.valid)return Object.assign(common,{status:'ORPHAN_STRUCTURE',decision:'STOP',proof:{authorized:false,reason:'HSC_LINEAGE_INCOMPLETE'}});
    if(!validation.authorized)return Object.assign(common,{status:'EXECUTION_WITHOUT_YEHI',decision:'STOP',proof:{authorized:false,reason:'AUTHORIZATION_TOKEN_MISSING'}});
    const currentCell=current.zeraCell||{};
    if(!previous)return Object.assign(common,{status:'P1_ORIGIN_CANDIDATE',decision:'ESTABLISH_INITIAL_REFERENCE',fromPoint:null,toPoint:point||1,retainedCellId:currentCell.cellId||null,governedMovement:{distanceM:null,distanceZera:null},proof:{authorized:true,reason:'P1_HAS_NO_PREVIOUS_MANIFESTED_POINT'}});
    const priorAnchor=previous.territorialAnchor||{},pc=priorAnchor.zeraCell||{},priorCell=retainedReference(previous,{roadId:n(pc.roadId==null?priorAnchor.road&&priorAnchor.road.id:pc.roadId),partIndex:n(pc.partIndex==null?priorAnchor.road&&priorAnchor.road.partIndex:pc.partIndex),index:n(pc.indexFromCanonicalPartStart==null?pc.indexFromRoadStart:pc.indexFromCanonicalPartStart),cellId:pc.cellId});
    const fromPoint=pointNumber(previous,Math.max(1,(point||2)-1)),toPoint=point||fromPoint+1,sourceAuthorized=source==='manual'||Boolean(acquisition.validationAuthorized);
    if(!registry||priorCell.roadId===null||priorCell.partIndex===null||priorCell.index===null)return Object.assign(common,{status:'ORPHAN_EXECUTION',decision:'MAINTAIN_PREVIOUS_VALID_POSITION',fromPoint,toPoint,retainedCellId:priorCell.cellId||null,governedMovement:{distanceM:0,distanceZera:0},proof:{authorized:false,reason:'PREVIOUS_GOVERNED_ZERA_UNAVAILABLE'}});
    const local=localRank(registry,priorCell,samples),winner=local.best,globalId=currentCell.cellId||null,globalEligible=Boolean(globalId&&local.eligibleCells.indexOf(globalId)>=0),bannedGlobal=Boolean(globalId&&!globalEligible);
    const omeh=omehScore(input.currentOmeh,previous.omehPresence,current.road&&current.road.street),sameRoad=Boolean(current.road&&Number(current.road.id)===priorCell.roadId),sampleSufficient=source==='manual'||samples.length>=4;
    const persistence=winner?samples.reduce((count,s)=>{const one=localRank(registry,priorCell,[s]).best;return count+(one&&one.zeraId===winner.zeraId?1:0)},0):0,persistenceRatio=samples.length?persistence/samples.length:0,localProximityQualified=Boolean(winner&&winner.medianDistanceM<=1);
    const witnesses=[
      {id:'QEDIMAH_LOCAL_WINDOW',supports:Boolean(winner&&Math.abs(winner.delta)<=1),independentFamily:'TERRITORIAL_POTENTIAL'},
      {id:'FIXED_ZERA_GPS_NEAREST',supports:Boolean(winner&&winner.delta!==0&&localProximityQualified),independentFamily:'FIXED_CELL_COORDINATE'},
      {id:'MULTI_SAMPLE_PERSISTENCE',supports:Boolean(winner&&winner.delta!==0&&localProximityQualified&&sampleSufficient&&persistenceRatio>=.67),independentFamily:'OBSERVATION_SERIES'},
      {id:'OMEH_STREET_CONTEXT',supports:Boolean(winner&&winner.delta!==0&&omeh.score>=80),independentFamily:'PADA_OMEH'}
    ],supporting=witnesses.filter(w=>w.supports),families=new Set(supporting.map(w=>w.independentFamily)),adjacent=Boolean(winner&&Math.abs(winner.delta)===1),manifest=sourceAuthorized&&sameRoad&&sampleSufficient&&adjacent&&!bannedGlobal&&families.size>=MIN_WITNESSES;
    const rawM=n(current.continuity&&current.continuity.distanceFromPreviousM);
    let status='POSITION_MAINTAINED',decision='MAINTAIN_PREVIOUS_VALID_POSITION',reason='CURRENT_OR_UNPROVEN_ADJACENT_CELL';
    if(bannedGlobal){status='NON_ADJACENT_CANDIDATE_BANNED';reason='GLOBAL_CANDIDATE_OUTSIDE_Zn_MINUS_1_Zn_Zn_PLUS_1'}
    if(!sourceAuthorized){status='POSITION_MAINTAINED';reason='ACQUISITION_NOT_AUTHORIZED'}
    if(!sameRoad){status='ROAD_TRANSITION_PENDING';reason='NEW_P0_REQUIRED_AFTER_CONFIRMED_ROAD_TRANSITION'}
    if(manifest){status='ADJACENT_POSITION_MANIFESTED';decision='MANIFEST_ADJACENT_CELL';reason='TWO_OR_MORE_INDEPENDENT_WITNESSES';}
    const retained=manifest&&winner?winner.zeraId:priorCell.cellId;
    return Object.assign(common,{status,decision,fromPoint,toPoint,retainedCellId:retained,candidateCellId:winner&&winner.zeraId||null,bannedCandidateCellId:bannedGlobal?globalId:null,localWindow:local,omehContribution:omeh,witnessGovernance:{required:MIN_WITNESSES,supportingCount:supporting.length,independentFamilyCount:families.size,witnesses,persistenceRatio,localProximityQualified,localProximityLimitM:1},governedMovement:{distanceM:manifest?ZERA_M:0,distanceZera:manifest?1:0},rawTerritorialCandidate:{distanceM:rawM,distanceZera:rawM===null?null:rawM/ZERA_M},proof:{authorized:manifest,reason,sourceAuthorized,sameRoad,sampleSufficient,globalEligible}});
  }
  root.ZeraContinuityGovernance=Object.freeze({version:VERSION,resolve});
})(typeof window!=='undefined'?window:globalThis);
