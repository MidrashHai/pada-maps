/* Zera Validated Prefix Resolver™ v0.1
 * PROBLEM-ZERA-008 → LAW-ZERA-VALIDATED-PREFIX-001
 * → HOQ-ZERA-VALIDATED-PREFIX-001 → SEQ-ZERA-VALIDATED-PREFIX-001
 *
 * Une transition n'est validée qu'avec Qedimah, deux familles indépendantes
 * favorables et au moins un témoin direct de traversée. Aucun seuil numérique
 * arbitraire n'est employé.
 */
(function(root){
  'use strict';
  const VERSION='0.1.0',ZERA_M=.36;
  const WITNESS_STATES=['NOT_AVAILABLE','OBSERVED','QUALIFIED','NEUTRAL','SUPPORT','STRONG_SUPPORT','CONTRADICT'];
  function text(value){return value==null?null:String(value)}
  function freeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.keys(value).forEach(key=>freeze(value[key]));return Object.freeze(value)}
  function witness(input){
    input=input||{};let state=text(input.state||'NOT_AVAILABLE');
    if(WITNESS_STATES.indexOf(state)<0)state='OBSERVED';
    return freeze({id:text(input.id||input.family||'UNKNOWN'),family:text(input.family||input.id||'UNKNOWN'),state,supports:state==='SUPPORT'||state==='STRONG_SUPPORT',contradicts:state==='CONTRADICT',directTraversal:Boolean(input.directTraversal),provenance:text(input.provenance||input.id||'UNDECLARED'),sourceObservationId:text(input.sourceObservationId),independent:Boolean(input.independent!==false)});
  }
  function explicitFor(input,from,to,index){
    const list=Array.isArray(input.transitionWitnesses)?input.transitionWitnesses:[];
    const found=list.find(item=>(item.index===index)||(item.fromZera===from&&item.toZera===to));
    if(!found)return[];
    if(Array.isArray(found.witnesses))return found.witnesses.map(witness);
    return[witness({id:found.id||'FIELD_TRANSITION_'+index,family:found.family||'FIELD_OBSERVATION',state:found.confirmed===true?'STRONG_SUPPORT':found.contradicts===true?'CONTRADICT':'OBSERVED',directTraversal:found.confirmed===true,provenance:found.provenance||'EXPLICIT_TRANSITION_WITNESS',sourceObservationId:found.sourceObservationId})];
  }
  function pathWideWitnesses(input,pathGovernance,index){
    const evidence=pathGovernance&&pathGovernance.evidence||{},families=Array.isArray(evidence.families)?evidence.families:[];
    const out=[witness({id:'QEDIMAH_ADJACENCY',family:'TERRITORIAL_GRAPH',state:'STRONG_SUPPORT',directTraversal:false,provenance:'QEDIMAH_FIXED_ZERA_PATH'})];
    families.forEach(item=>{
      if(item.id==='CALIBRATED_FIELD_WITNESS'&&evidence.fieldValid)out.push(witness({id:item.id,family:item.family||'FIELD_OBSERVATION',state:'STRONG_SUPPORT',directTraversal:true,provenance:'CALIBRATED_FIELD_WITNESS'}));
      else if(item.id==='MULTI_SAMPLE_ACQUISITION')out.push(witness({id:item.id,family:item.family||'GPS_OBSERVATION_SERIES',state:item.supports?'SUPPORT':'NOT_AVAILABLE',directTraversal:false,provenance:'GPS_ACQUISITION_WINDOW'}));
      else if(item.id==='OMEH_STREET_CONTEXT')out.push(witness({id:item.id,family:item.family||'OMEH_PADA_CONTEXT',state:item.supports?'NEUTRAL':'NOT_AVAILABLE',directTraversal:false,provenance:'OMEH_STREET_CONTEXT'}));
    });
    const field=input.calibratedFieldWitness;
    if(field&&field.confirmed===true&&Number(field.traversedZera)>index&&!out.some(item=>item.family==='FIELD_OBSERVATION'))out.push(witness({id:'CALIBRATED_FIELD_WITNESS',family:'FIELD_OBSERVATION',state:'STRONG_SUPPORT',directTraversal:true,provenance:field.provenance||'CALIBRATED_FIELD_WITNESS'}));
    return out;
  }
  function dedupe(witnesses){
    const map={};witnesses.forEach(item=>{const key=item.family||item.id,previous=map[key],order={NOT_AVAILABLE:0,OBSERVED:1,QUALIFIED:2,NEUTRAL:3,SUPPORT:4,STRONG_SUPPORT:5,CONTRADICT:6};if(!previous||order[item.state]>order[previous.state])map[key]=item});return Object.values(map);
  }
  function transitionEvidence(input,pathGovernance,from,to,index){
    const witnesses=dedupe(pathWideWitnesses(input,pathGovernance,index).concat(explicitFor(input,from,to,index)));
    const supporting=witnesses.filter(item=>item.supports&&item.independent),contradictions=witnesses.filter(item=>item.contradicts),direct=supporting.filter(item=>item.directTraversal);
    const validated=contradictions.length===0&&supporting.length>=2&&direct.length>=1;
    const state=contradictions.length?'EVIDENCE_CONTRADICTORY':validated?'TRANSITION_VALIDATED':supporting.length>=2?'EVIDENCE_CONVERGENT_NO_DIRECT_TRAVERSAL':supporting.length?'EVIDENCE_PARTIAL':'EVIDENCE_INSUFFICIENT';
    return freeze({type:'TransitionEvidence',schemaVersion:VERSION,index,fromZera:from,toZera:to,qedimahStatus:'ADJACENCY_VERIFIED',witnesses,independentSupportingFamilies:supporting.map(item=>item.family),directTraversalFamilies:direct.map(item=>item.family),contradictions:contradictions.map(item=>item.family),evidenceState:state,epistemicStatus:validated?'GOVERNABLE_TRANSITION':'NOT_GOVERNABLE',validated});
  }
  function resolve(input){
    input=input||{};const pathGovernance=input.pathGovernance||input.zeraPathGovernance||{},path=pathGovernance.path||{},cells=Array.isArray(path.cells)?path.cells.slice():[];
    const registry=root.ZeraHSCSequenceRegistry,contract=registry&&registry.validatedPrefixContract,validation=registry&&registry.validate(contract);
    const common={engine:'Zera Validated Prefix Resolver™',version:VERSION,problemId:contract&&contract.problem_id,lawId:contract&&contract.law_id,hoqId:contract&&contract.hoq_id,sequenceId:contract&&contract.sequence_id,executionId:contract&&contract.execution_id,hscContractStatus:validation&&validation.status,authorizationTokenIssued:Boolean(validation&&validation.authorized),witnessStateMachine:WITNESS_STATES.slice(),thresholdPolicy:'NO_NUMERIC_VALIDATION_THRESHOLD_UNTIL_FIELD_CALIBRATION'};
    if(!validation||!validation.valid)return freeze(Object.assign(common,{status:'ORPHAN_STRUCTURE',decision:'STOP'}));
    if(!validation.authorized)return freeze(Object.assign(common,{status:'EXECUTION_WITHOUT_YEHI',decision:'STOP'}));
    if(cells.length<1)return freeze(Object.assign(common,{status:'PATH_UNAVAILABLE',decision:'HOLD_LAST_GOVERNED_ZERA',transitionEvidence:[],validatedPrefix:[],unresolvedSuffix:[]}));
    if(cells.length===1)return freeze(Object.assign(common,{status:'SAME_CELL_NO_TRANSITION',decision:'MAINTAIN_GOVERNED_ZERA',originZeraId:cells[0],governedZeraId:cells[0],transitionEvidence:[],validatedPrefix:cells,unresolvedSuffix:[],governedMovement:{distanceZera:0,distanceM:0}}));
    const transitions=[];for(let index=0;index<cells.length-1;index++)transitions.push(transitionEvidence(input,pathGovernance,cells[index],cells[index+1],index));
    let validatedCount=0;while(validatedCount<transitions.length&&transitions[validatedCount].validated)validatedCount++;
    const prefix=cells.slice(0,validatedCount+1),suffix=validatedCount<transitions.length?cells.slice(validatedCount):[];
    const status=validatedCount===0?'PREFIX_EMPTY':validatedCount===transitions.length?'COMPLETE_PATH_VALIDATED':'PREFIX_PARTIALLY_VALIDATED';
    const decision=validatedCount===0?'HOLD_LAST_GOVERNED_ZERA':validatedCount===transitions.length?'MANIFEST_COMPLETE_PATH':'MANIFEST_VALIDATED_PREFIX_ONLY';
    return freeze(Object.assign(common,{status,decision,originZeraId:cells[0],destinationCandidateZeraId:cells[cells.length-1],governedZeraId:prefix[prefix.length-1],transitionEvidence:transitions,validatedPrefix:prefix,unresolvedSuffix:suffix,validatedTransitionCount:validatedCount,unresolvedTransitionCount:transitions.length-validatedCount,governedMovement:{distanceZera:validatedCount,distanceM:Number((validatedCount*ZERA_M).toFixed(2))},reason:validatedCount===0?'NO_CONSECUTIVE_DIRECTLY_PROVEN_TRANSITION':validatedCount===transitions.length?'EVERY_TRANSITION_IN_PATH_PROVEN':'ONLY_CONSECUTIVE_PROVEN_PREFIX_MANIFESTED'}));
  }
  root.ZeraValidatedPrefixResolver=Object.freeze({version:VERSION,metersPerZera:ZERA_M,witnessStates:WITNESS_STATES.slice(),witness,transitionEvidence,resolve});
})(typeof window!=='undefined'?window:globalThis);
