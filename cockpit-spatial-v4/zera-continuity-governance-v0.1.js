/* Zera Continuity Governance™ v0.1
 * PROBLEM-ZERA-001 · Migration Fantôme de Zera™
 * Une variation GPS ne déplace jamais directement une Présence gouvernée.
 */
(function(root){
  'use strict';

  const VERSION='0.1.0';
  const ZERA_M=0.36;
  const AMBIGUOUS_MATCHES=new Set(['ZERA_GPS_MATCH_AMBIGUOUS','P2_PENDING_MORE_SAMPLES']);

  function finite(value){const n=Number(value);return Number.isFinite(n)?n:null}
  function pointNumber(observation,fallback){
    const n=finite(observation&&observation.pointIndex);
    return n==null?fallback:n;
  }
  function resolve(input){
    const current=input&&input.currentAnchor||{};
    const previous=input&&input.previousObservation||null;
    const acquisition=input&&input.acquisitionGovernance||null;
    const source=String(input&&input.source||'gps').toLowerCase();
    const currentPoint=pointNumber(input&&input.currentObservation,null);
    const sequence=['ACQUIRE','COMPARE_WITH_PREVIOUS_VALID_POINT','QUALIFY_MOVEMENT_PROOF','GOVERN','MANIFEST_OR_MAINTAIN'];
    const common={
      engine:'Zera Continuity Governance™',version:VERSION,
      problemId:'PROBLEM-ZERA-001',lawId:'LAW-ZERA-001',hoqId:'HOQ-ZERA-001',
      sequenceId:'SEQ-ZERA-CONTINUITY-001',sequence,
      law:'A_GPS_OBSERVATION_NEVER_DIRECTLY_MOVES_A_GOVERNED_PRESENCE',
      hoq:'LAST_VALID_POSITION_REMAINS_AUTHORITY_UNTIL_MOVEMENT_IS_PROVEN'
    };
    if(!previous){
      return Object.assign(common,{status:'P1_ORIGIN_CANDIDATE',decision:'ESTABLISH_INITIAL_REFERENCE',fromPoint:null,toPoint:currentPoint||1,retainedCellId:current.zeraCell&&current.zeraCell.cellId||null,governedMovement:{distanceM:null,distanceZera:null},proof:{authorized:false,reason:'NO_PREVIOUS_POINT'}});
    }
    const priorAnchor=previous.territorialAnchor||{};
    const priorCell=priorAnchor.zeraCell||{};
    const currentCell=current.zeraCell||{};
    const match=current.zeraGpsMatch||{};
    const transition=current.roadResolution&&current.roadResolution.transition||{};
    const samePart=Boolean(priorCell.roadId===currentCell.roadId&&priorCell.partIndex===currentCell.partIndex);
    const sourceAuthorized=source==='manual'||Boolean(acquisition&&acquisition.validationAuthorized);
    const confidence=finite(current.confidence&&current.confidence.score)||0;
    const ambiguous=AMBIGUOUS_MATCHES.has(match.status);
    const roadUnconfirmed=Boolean(transition.changed&&!transition.confirmed);
    const proofAuthorized=sourceAuthorized&&!ambiguous&&confidence>=55&&!roadUnconfirmed&&Boolean(currentCell.cellId);
    const fromPoint=pointNumber(previous,Math.max(1,(currentPoint||2)-1));
    const toPoint=currentPoint||fromPoint+1;
    const rawCandidateM=finite(current.continuity&&current.continuity.distanceFromPreviousM);
    if(!proofAuthorized){
      let reason='MOVEMENT_PROOF_INSUFFICIENT';
      if(!sourceAuthorized)reason='ACQUISITION_NOT_AUTHORIZED';
      else if(roadUnconfirmed)reason='ROAD_TRANSITION_NOT_CONFIRMED';
      else if(ambiguous)reason='ZERA_MATCH_AMBIGUOUS';
      else if(confidence<55)reason='TERRITORIAL_CONFIDENCE_BELOW_55';
      return Object.assign(common,{status:'ZERA_PHANTOM_MIGRATION_BLOCKED',decision:'MAINTAIN_PREVIOUS_VALID_POSITION',fromPoint,toPoint,retainedCellId:priorCell.cellId||null,candidateCellId:currentCell.cellId||null,governedMovement:{distanceM:0,distanceZera:0},rawTerritorialCandidate:{distanceM:rawCandidateM,distanceZera:rawCandidateM==null?null:rawCandidateM/ZERA_M},proof:{authorized:false,reason,sourceAuthorized,ambiguous,confidence,roadUnconfirmed}});
    }
    let distanceM=rawCandidateM;
    if(samePart){
      const before=finite(priorAnchor.road&&priorAnchor.road.chainageFromPartStartM);
      const now=finite(current.road&&current.road.chainageFromPartStartM);
      if(before!==null&&now!==null)distanceM=Math.abs(now-before);
    }
    if(distanceM===null)distanceM=0;
    return Object.assign(common,{status:'GOVERNED_MOVEMENT_MANIFESTED',decision:'MANIFEST_CURRENT_POSITION',fromPoint,toPoint,retainedCellId:currentCell.cellId||null,candidateCellId:currentCell.cellId||null,governedMovement:{distanceM,distanceZera:distanceM/ZERA_M},rawTerritorialCandidate:{distanceM:rawCandidateM,distanceZera:rawCandidateM==null?null:rawCandidateM/ZERA_M},proof:{authorized:true,reason:'MULTI_SAMPLE_TERRITORIAL_PROOF',sourceAuthorized,ambiguous:false,confidence,roadUnconfirmed:false}});
  }

  root.ZeraContinuityGovernance=Object.freeze({version:VERSION,resolve});
})(typeof window!=='undefined'?window:globalThis);
