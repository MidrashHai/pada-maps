/* Zera Governed Path Resolver™ v0.1
 * PROBLEM-ZERA-003 → LAW-ZERA-PATH-001 → HOQ-ZERA-PATH-001
 * Un chemin possible n'est jamais assimilé à un chemin parcouru.
 */
(function(root){
  'use strict';
  const VERSION='0.1.0',ZERA_M=.36,MAX_AUDITABLE_TRANSITIONS=512;
  function n(v){v=Number(v);return Number.isFinite(v)?v:null}
  function parse(id){const m=id&&String(id).match(/\.R(\d+)\.P(\d+)\.Z(\d+)$/);return m?{roadId:+m[1],partIndex:+m[2],index:+m[3],zeraId:String(id)}:null}
  function previousCell(previous){
    const governance=previous&&previous.zeraContinuityGovernance||{},retained=parse(governance.retainedCellId);
    if(retained)return retained;
    const a=previous&&previous.territorialAnchor||{},z=a.zeraCell||{},id=z.cellId||z.zeraId;
    return parse(id)||{roadId:n(z.roadId==null?a.road&&a.road.id:z.roadId),partIndex:n(z.partIndex==null?a.road&&a.road.partIndex:z.partIndex),index:n(z.indexFromCanonicalPartStart==null?z.indexFromRoadStart:z.indexFromCanonicalPartStart),zeraId:id||null};
  }
  function buildLinearPath(registry,origin,destination){
    if(!origin||!destination||origin.roadId!==destination.roadId||origin.partIndex!==destination.partIndex)return{status:'PATH_NOT_FOUND',reason:'ROAD_OR_PART_DISCONTINUITY',cells:[]};
    const delta=destination.index-origin.index,count=Math.abs(delta);
    if(count>MAX_AUDITABLE_TRANSITIONS)return{status:'PATH_REJECTED',reason:'PATH_EXCEEDS_AUDITABLE_LIMIT',cells:[],transitionCount:count};
    const step=Math.sign(delta)||1,cells=[];
    for(let i=0;i<=count;i++){
      const cell=registry.getCell({roadId:origin.roadId,partIndex:origin.partIndex,index:origin.index+i*step,withAnchors:false});
      if(!cell||cell.index!==origin.index+i*step)return{status:'PATH_NOT_FOUND',reason:'INTERMEDIATE_ZERA_MISSING',cells,transitionCount:count};
      cells.push(cell.zeraId);
    }
    return{status:'PATH_CANDIDATE',reason:'CONTINUOUS_QEDIMAH_PATH_FOUND',cells,transitionCount:count,direction:delta===0?'STILL':delta>0?'FORWARD':'BACKWARD'};
  }
  function movementEvidence(input,path){
    const field=input&&input.calibratedFieldWitness||null,samples=Array.isArray(input&&input.samples)?input.samples:[],acq=input&&input.acquisitionGovernance||{},omeh=input&&input.currentOmeh||{},observed=omeh.observedStreet||{},road=input&&input.currentAnchor&&input.currentAnchor.road||{};
    const fieldValid=Boolean(field&&field.confirmed===true&&n(field.traversedZera)===path.transitionCount&&(!field.direction||field.direction===path.direction));
    const acquisitionSeries=Boolean(acq.validationAuthorized&&samples.length>=4);
    const omehStreet=Boolean(omeh.status==='STREET_PRESENCE_OBSERVED'&&observed.street&&road.street&&observed.street===road.street);
    const families=[
      {id:'QEDIMAH_GRAPH',family:'TERRITORIAL_GRAPH',supports:path.status==='PATH_CANDIDATE'},
      {id:'CALIBRATED_FIELD_WITNESS',family:'FIELD_OBSERVATION',supports:fieldValid},
      {id:'MULTI_SAMPLE_ACQUISITION',family:'GPS_OBSERVATION_SERIES',supports:acquisitionSeries,level:acquisitionSeries?'PARTIAL':'INSUFFICIENT'},
      {id:'OMEH_STREET_CONTEXT',family:'OMEH_PADA_CONTEXT',supports:omehStreet,level:omehStreet?'STREET_ONLY':'INSUFFICIENT'}
    ];
    return{families,fieldValid,acquisitionSeries,omehStreet,independentSupportingFamilies:families.filter(x=>x.supports).length};
  }
  function resolve(input){
    const registry=root.ZeraFixedCoordinateRegistry,hsc=root.ZeraHSCSequenceRegistry,contract=hsc&&hsc.pathContract,plenitude=hsc&&hsc.plenitudeContract,validation=hsc&&hsc.validate(contract),plenitudeValidation=hsc&&hsc.validate(plenitude);
    const common={engine:'Zera Governed Path Resolver™',version:VERSION,problemId:contract&&contract.problem_id,lawId:contract&&contract.law_id,hoqId:contract&&contract.hoq_id,sequenceId:contract&&contract.sequence_id,executionId:contract&&contract.execution_id,hscContractStatus:validation&&validation.status,authorizationTokenIssued:Boolean(validation&&validation.authorized),constitutiveAdmission:{problemId:plenitude&&plenitude.problem_id,lawId:plenitude&&plenitude.law_id,hoqId:plenitude&&plenitude.hoq_id,sequenceId:plenitude&&plenitude.sequence_id,executionId:plenitude&&plenitude.execution_id,status:plenitudeValidation&&plenitudeValidation.status,authorizationTokenIssued:Boolean(plenitudeValidation&&plenitudeValidation.authorized),rule:'QEDIMAH_VALID_SPACE_PRECEDES_GPS_WITNESS'}};
    if(!validation||!validation.valid||!plenitudeValidation||!plenitudeValidation.valid)return Object.assign(common,{status:'ORPHAN_STRUCTURE',decision:'STOP'});
    if(!validation.authorized||!plenitudeValidation.authorized)return Object.assign(common,{status:'EXECUTION_WITHOUT_YEHI',decision:'STOP'});
    const previous=input&&input.previousObservation||null;
    if(!previous)return Object.assign(common,{status:'NO_PATH_REQUIRED_FOR_P1',decision:'ESTABLISH_ORIGIN',governedMovement:{distanceZera:null,distanceM:null}});
    const origin=previousCell(previous),current=input&&input.currentAnchor||{},observedDestination=parse(current.zeraCell&&(current.zeraCell.cellId||current.zeraCell.zeraId)),field=input&&input.calibratedFieldWitness||null,fieldCount=field&&field.confirmed===true?n(field.traversedZera):null,fieldStep=field&&field.direction==='BACKWARD'?-1:field&&field.direction==='FORWARD'?1:0;
    let admittedDestination=observedDestination,admissionSource='GPS_OBSERVATION_PROPOSAL_ONLY';
    if(registry&&origin&&fieldCount!==null&&fieldCount>=0&&Number.isInteger(fieldCount)&&fieldStep!==0){
      const admittedCell=registry.getCell({roadId:origin.roadId,partIndex:origin.partIndex,index:origin.index+fieldStep*fieldCount,withAnchors:false});
      if(admittedCell){admittedDestination=parse(admittedCell.zeraId);admissionSource='QEDIMAH_PLUS_CALIBRATED_FIELD_WITNESS'}
    }
    if(!registry||!origin||!admittedDestination)return Object.assign(common,{status:'PATH_NOT_FOUND',decision:'HOLD',reason:'ORIGIN_DESTINATION_OR_REGISTRY_UNAVAILABLE',observedGpsCandidateZeraId:observedDestination&&observedDestination.zeraId||null,governedMovement:{distanceZera:0,distanceM:0}});
    const path=buildLinearPath(registry,origin,admittedDestination);
    const admission={source:admissionSource,validSpaceOpenedBeforeObservation:true,originZeraId:origin.zeraId,observedGpsCandidateZeraId:observedDestination&&observedDestination.zeraId||null,admittedDestinationZeraId:admittedDestination.zeraId,gpsCandidateGovernanceAuthority:false};
    if(path.status!=='PATH_CANDIDATE')return Object.assign(common,{status:path.status,decision:'HOLD',reason:path.reason,originZeraId:origin.zeraId,destinationCandidateZeraId:admittedDestination.zeraId,admission,path,governedMovement:{distanceZera:0,distanceM:0}});
    if(path.transitionCount<=1)return Object.assign(common,{status:'ADJACENT_PATH_DELEGATED',decision:'USE_EARTHBOUND_GOVERNANCE',originZeraId:origin.zeraId,destinationCandidateZeraId:admittedDestination.zeraId,admission,path,governedMovement:{distanceZera:0,distanceM:0}});
    const evidence=movementEvidence(input,path),validated=evidence.fieldValid&&evidence.independentSupportingFamilies>=2;
    const supported=!validated&&(evidence.acquisitionSeries||evidence.omehStreet),status=validated?'PATH_VALIDATED':supported?'PATH_SUPPORTED':'PATH_CANDIDATE',decision=validated?'MANIFEST_VALIDATED_PATH':'HOLD_LAST_GOVERNED_POSITION';
    return Object.assign(common,{status,decision,reason:validated?'QEDIMAH_PATH_PLUS_CALIBRATED_TRAVERSAL_PROOF':supported?'PATH_EXISTS_BUT_TRAVERSAL_NOT_PROVEN':'INSUFFICIENT_EVIDENCE',originZeraId:origin.zeraId,destinationCandidateZeraId:admittedDestination.zeraId,admission,path,evidence,governedMovement:{distanceZera:validated?path.transitionCount:0,distanceM:validated?path.transitionCount*ZERA_M:0},retainedCellId:validated?admittedDestination.zeraId:origin.zeraId});
  }
  root.ZeraGovernedPathResolver=Object.freeze({version:VERSION,metersPerZera:ZERA_M,maxAuditableTransitions:MAX_AUDITABLE_TRANSITIONS,resolve});
})(typeof window!=='undefined'?window:globalThis);
