/* Qedimah Territorial Potential™ 159 · v0.1
 * ק100 + ד4 + י10 + מ40 + ה5 = 159 → Aleph · He · Tet.
 * P0 précède P1 avec toutes les Zera possibles de la rue constituée.
 * P1 ne crée aucune cellule : il navigue dans le potentiel ouvert par P0.
 */
(function(root){
  'use strict';
  const VERSION='0.1.0',MIN_SAMPLES=4,GEMATRIA=159;
  function median(values){if(!values.length)return null;const a=values.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
  function normalizeSamples(input,anchor){
    const rows=Array.isArray(input.samples)&&input.samples.length?input.samples:[anchor&&anchor.gpsInput].filter(Boolean);
    return rows.map((s,index)=>({index,lat:Number(s.lat==null?s.latitude:s.lat),lon:Number(s.lon==null?s.longitude:s.lon)})).filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)).map(s=>Object.assign(s,{utm:root.ZeraFixedCoordinateRegistry.wgs84ToUtm30(s.lat,s.lon)}));
  }
  function resolveReference(input){
    const anchor=input.anchor||{},previous=input.previousQedimah||null,transition=anchor.roadResolution&&anchor.roadResolution.transition||{};
    const current=anchor.road&&{roadId:anchor.road.id,partIndex:anchor.road.partIndex,street:anchor.road.street};
    if(!previous)return current?{reference:current,birth:'QEDIMAH_BORN_FROM_FIRST_P1_OBSERVATION',generation:1,previous:null}:null;
    const old=previous.streetPotential&&previous.streetPotential.reference;
    if(transition.status==='ROAD_TRANSITION_CONFIRMED'&&current&&Number(current.roadId)!==Number(old.roadId))return{reference:current,birth:'QEDIMAH_REBORN_ON_CONFIRMED_ROAD_TRANSITION',generation:Number(previous.generation||1)+1,previous};
    return old?{reference:old,birth:'QEDIMAH_INHERITED_UNTIL_CONFIRMED_ROAD_TRANSITION',generation:Number(previous.generation||1),previous}:null;
  }
  function rankPotentials(reference,samples,data){
    const registry=root.ZeraFixedCoordinateRegistry,summaries=[];for(let partIndex=0;;partIndex++){const summary=registry.roadSummary({data,roadId:reference.roadId,partIndex});if(!summary)break;summaries.push(summary)}if(!summaries.length)return{summary:null,ranked:[]};
    const ranked=[];for(const summary of summaries)for(let index=0;index<summary.cellCount;index++){
      const cell=registry.getCell({data,roadId:reference.roadId,partIndex:summary.partIndex,index,withAnchors:false});
      const distances=samples.map(s=>({sampleIndex:s.index,distanceM:Math.hypot(s.utm.x-cell.utmCoordinate.center.x,s.utm.y-cell.utmCoordinate.center.y)}));
      ranked.push({zeraId:cell.zeraId,partIndex:summary.partIndex,index,fixedGpsCenter:cell.fixedCoordinate.center,medianDistanceM:median(distances.map(d=>d.distanceM)),minimumDistanceM:distances.length?Math.min.apply(null,distances.map(d=>d.distanceM)):null,sampleDistances:distances});
    }
    ranked.sort((a,b)=>(a.medianDistanceM==null?Infinity:a.medianDistanceM)-(b.medianDistanceM==null?Infinity:b.medianDistanceM));return{summary:{roadId:reference.roadId,street:summaries[0].street,partCount:summaries.length,lengthM:summaries.reduce((n,s)=>n+s.lengthM,0),cellCount:summaries.reduce((n,s)=>n+s.cellCount,0),ranges:summaries.map(s=>({partIndex:s.partIndex,firstZeraId:s.firstZeraId,lastZeraId:s.lastZeraId,count:s.cellCount,lengthM:s.lengthM}))},ranked};
  }
  function evolve(input){
    const data=input.data||root.TERRITORIAL_ANCHOR_DATA,registry=root.ZeraFixedCoordinateRegistry;
    if(!data||!registry)return{engine:'Qedimah Territorial Potential™ 159',version:VERSION,status:'LIBRARY_UNAVAILABLE'};
    const anchor=input.anchor||null,referenceState=resolveReference(input);if(!referenceState)return{engine:'Qedimah Territorial Potential™ 159',version:VERSION,status:'QEDIMAH_UNRESOLVED',reason:'STREET_REFERENCE_UNAVAILABLE'};
    const samples=normalizeSamples(input,anchor),result=rankPotentials(referenceState.reference,samples,data),ranked=result.ranked,first=ranked[0]||null,second=ranked[1]||null,margin=first&&second?second.medianDistanceM-first.medianDistanceM:null,previous=referenceState.previous;
    const sameBirth=previous&&referenceState.birth==='QEDIMAH_INHERITED_UNTIL_CONFIRMED_ROAD_TRANSITION',bornAt=sameBirth?previous.bornAt:new Date().toISOString(),qedimahId='QDM159.COCODY.R'+String(referenceState.reference.roadId).padStart(4,'0')+'.G'+String(referenceState.generation).padStart(3,'0');
    const candidateStatus=samples.length<MIN_SAMPLES?'P0_POTENTIAL_PROPOSED':'P1_NAVIGATING_P0_POTENTIAL',top=ranked.slice(0,10);
    return{engine:'Qedimah Territorial Potential™',version:VERSION,qedimahId,generation:referenceState.generation,status:candidateStatus,birth:referenceState.birth,bornAt,gematria:{value:GEMATRIA,hebrew:'קְדִימָה',calculation:'100+4+10+40+5',sequence:[{digit:1,letter:'Aleph',mission:'ORIGIN_OPENS_COMPLETE_STREET_ZERA_POTENTIAL'},{digit:5,letter:'He',mission:'REVEAL_NEAREST_POTENTIALS_TO_P1_OBSERVATIONS'},{digit:9,letter:'Tet',mission:'PRESERVE_HIDDEN_POTENTIAL_UNTIL_GOVERNED_MANIFESTATION'}],sequenceImmutable:true},streetPotential:{reference:referenceState.reference,allPossibleZeras:{representation:'DETERMINISTIC_COMPLETE_STREET_RANGES',partCount:result.summary.partCount,ranges:result.summary.ranges,count:result.summary.cellCount,lengthM:result.summary.lengthM,generationRule:'EVERY_FIXED_ZERA_OF_CONFIRMED_STREET_ALL_PARTS'},doesNotRestrictToAddressDomain:true},p1Navigation:{sampleCount:samples.length,minimumSamples:MIN_SAMPLES,nearestPotentialZeras:top.slice(0,3),rankedPotentialZeras:top,bestPotentialZera:first,secondPotentialZera:second,marginToSecondM:margin,manifestationStatus:samples.length<MIN_SAMPLES?'P1_NOT_YET_MANIFESTED':'P1_CANDIDATE_FROM_QEDIMAH',rule:'P1_MUST_SELECT_FROM_P0_PREEXISTING_STREET_POTENTIAL'},governance:{p0PrecedesP1:true,p1CannotCreateCoordinates:true,p1CannotCreateZera:true,newP0OnlyOnConfirmedRoadTransition:true,unconfirmedRoadTransitionKeepsPreviousP0:true,positionConfirmed:false,lawId:'FL-QEDIMAH-159',hoqId:'HOQ-QEDIMAH-P0-P1-001'},lineage:{previousQedimahId:previous&&previous.qedimahId||null,sourceAnchorStatus:anchor&&anchor.status||null,sourceRoadTransition:anchor&&anchor.roadResolution&&anchor.roadResolution.transition&&anchor.roadResolution.transition.status||'ORIGIN'}};
  }
  root.QedimahTerritorialPotential=Object.freeze({version:VERSION,gematria:GEMATRIA,minimumSamples:MIN_SAMPLES,evolve});
})(typeof window!=='undefined'?window:globalThis);
