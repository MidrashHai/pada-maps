/* Territorial Anchor Resolver™ v0.3 · Convergence PADA multi-prises
 * Une cellule est un segment déterministe de 0,36 m sur une partie de voirie PADA.
 * L'identifiant est stable tant que la géométrie source et sa version ne changent pas.
 * Le GPS observe; PADA, la continuité et plusieurs prises résolvent la position.
 */
(function(root){
  'use strict';
  const VERSION='0.3.0',ZERA_M=0.36,RADII=[35,10,1,0.36],MIN_CONVERGENCE_SAMPLES=4;

  function wgs84ToUtm30(lat,lon){
    const a=6378137,e=0.00669438,k=.9996,z=30,p=lat*Math.PI/180,l=lon*Math.PI/180,l0=((z-1)*6-177)*Math.PI/180,ep=e/(1-e),N=a/Math.sqrt(1-e*Math.sin(p)**2),T=Math.tan(p)**2,C=ep*Math.cos(p)**2,A=Math.cos(p)*(l-l0);
    const M=a*((1-e/4-3*e**2/64-5*e**3/256)*p-(3*e/8+3*e**2/32+45*e**3/1024)*Math.sin(2*p)+(15*e**2/256+45*e**3/1024)*Math.sin(4*p)-35*e**3/3072*Math.sin(6*p));
    const x=k*N*(A+(1-T+C)*A**3/6+(5-18*T+T**2+72*C-58*ep)*A**5/120)+500000;
    let y=k*(M+N*Math.tan(p)*(A**2/2+(5-T+9*C+4*C**2)*A**4/24+(61-58*T+T**2+600*C-330*ep)*A**6/720));if(lat<0)y+=10000000;
    return{x,y,crs:'EPSG:32630'};
  }

  function utm30ToWgs84(x,y){
    const a=6378137,e=.00669438,k=.9996,e1=(1-Math.sqrt(1-e))/(1+Math.sqrt(1-e)),ep=e/(1-e);x-=500000;
    const M=y/k,mu=M/(a*(1-e/4-3*e**2/64-5*e**3/256));
    const p1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
    const N1=a/Math.sqrt(1-e*Math.sin(p1)**2),T1=Math.tan(p1)**2,C1=ep*Math.cos(p1)**2,R1=a*(1-e)/(1-e*Math.sin(p1)**2)**1.5,D=x/(N1*k);
    const lat=p1-N1*Math.tan(p1)/R1*(D**2/2-(5+3*T1+10*C1-4*C1**2-9*ep)*D**4/24+(61+90*T1+298*C1+45*T1**2-252*ep-3*C1**2)*D**6/720);
    const lon=(-3*Math.PI/180)+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1**2+8*ep+24*T1**2)*D**5/120)/Math.cos(p1);
    return{lat:lat*180/Math.PI,lon:lon*180/Math.PI};
  }

  function pointKey(p){return p[0].toFixed(2)+'|'+p[1].toFixed(2)}
  function canonicalParts(road){
    return road[2].map(line=>{
      const copy=line.slice(),first=copy[0],last=copy[copy.length-1];
      if(pointKey(first)>pointKey(last))copy.reverse();
      return copy;
    }).sort((a,b)=>pointKey(a[0]).localeCompare(pointKey(b[0])));
  }
  function lineLength(line){let n=0;for(let i=1;i<line.length;i++)n+=Math.hypot(line[i][0]-line[i-1][0],line[i][1]-line[i-1][1]);return n}
  function pointAt(line,chainage){
    let done=0;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(done+len>=chainage||i===line.length-1){const t=len?Math.max(0,Math.min(1,(chainage-done)/len)):0;return{x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t}}done+=len}return{x:line[0][0],y:line[0][1]};
  }
  function project(point,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/l2)):0,x=a[0]+t*dx,y=a[1]+t*dy;return{x,y,t,distanceM:Math.hypot(point.x-x,point.y-y),lengthM:Math.sqrt(l2)}}

  function median(values){
    if(!values.length)return null;
    const a=values.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  function normalizeSamples(input,lat,lon,accuracy){
    const source=Array.isArray(input.samples)?input.samples:Array.isArray(input.acquisitionSamples)?input.acquisitionSamples:[];
    const valid=source.map(s=>({lat:Number(s.lat==null?s.latitude:s.lat),lon:Number(s.lon==null?s.longitude:s.lon),accuracyM:Number(s.accuracyM==null?s.accuracy:s.accuracyM)})).filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon));
    if(!valid.length)valid.push({lat,lon,accuracyM:accuracy});
    return valid.map(s=>Object.assign({},s,{utm:wgs84ToUtm30(s.lat,s.lon)}));
  }
  function robustObservation(samples){
    const x=median(samples.map(s=>s.utm.x)),y=median(samples.map(s=>s.utm.y));
    const distances=samples.map(s=>Math.hypot(s.utm.x-x,s.utm.y-y));
    const mad=median(distances),limit=Math.max(1,(mad||0)*3),inliers=samples.filter((s,i)=>distances[i]<=limit);
    const kept=inliers.length?inliers:samples,cx=median(kept.map(s=>s.utm.x)),cy=median(kept.map(s=>s.utm.y));
    const residuals=kept.map(s=>Math.hypot(s.utm.x-cx,s.utm.y-cy));
    return{x:cx,y:cy,crs:'EPSG:32630',sampleCount:samples.length,inlierCount:kept.length,rejectedCount:samples.length-kept.length,medianSpreadM:median(residuals)||0,maxSpreadM:residuals.length?Math.max.apply(null,residuals):0,method:samples.length>1?'ROBUST_MEDIAN_UTM':'SINGLE_GPS'};
  }

  function nearestRoad(point,data){
    let best=null;
    for(const road of data.roads){const parts=canonicalParts(road);for(let pi=0;pi<parts.length;pi++){const line=parts[pi],total=lineLength(line);let before=0;for(let i=1;i<line.length;i++){const p=project(point,line[i-1],line[i]),chainage=before+p.t*p.lengthM;if(!best||p.distanceM<best.distanceM)best={id:road[0],streetIndex:road[1],street:data.streets[road[1]],partIndex:pi,partCount:parts.length,distanceM:p.distanceM,x:p.x,y:p.y,chainageFromPartStartM:chainage,distanceToPartEndM:Math.max(0,total-chainage),partLengthM:total,line};before+=p.lengthM}}}
    return best;
  }
  function projectOnRoad(point,road,data){
    let best=null;if(!road)return null;
    const parts=canonicalParts(road);
    for(let pi=0;pi<parts.length;pi++){const line=parts[pi],total=lineLength(line);let before=0;for(let i=1;i<line.length;i++){const p=project(point,line[i-1],line[i]),chainage=before+p.t*p.lengthM;if(!best||p.distanceM<best.distanceM)best={id:road[0],streetIndex:road[1],street:data.streets[road[1]],partIndex:pi,partCount:parts.length,distanceM:p.distanceM,x:p.x,y:p.y,chainageFromPartStartM:chainage,distanceToPartEndM:Math.max(0,total-chainage),partLengthM:total,line};before+=p.lengthM}}return best;
  }
  function roadCandidates(point,samples,near,data,previous){
    const keys={},add=r=>{if(r)keys[r.id+'|'+r.partIndex]=r};
    add(nearestRoad(point,data));
    samples.forEach(s=>add(nearestRoad(s.utm,data)));
    near.slice(0,12).forEach(a=>{for(const road of data.roads)if(road[1]===a.streetIndex)add(projectOnRoad(point,road,data))});
    if(previous&&previous.road){const source=data.roads.find(r=>r[0]===previous.road.id);if(source)add(projectOnRoad(point,source,data))}
    return Object.values(keys);
  }
  function selectRoad(point,samples,near,data,previous){
    const candidates=roadCandidates(point,samples,near,data,previous),previousPoint=previous&&previous.resolvedPosition;
    const scored=candidates.map(road=>{
      const sourceRoad=data.roads.find(r=>r[0]===road.id),sampleDistances=samples.map(s=>projectOnRoad(s.utm,sourceRoad,data)).filter(Boolean).map(p=>p.distanceM);
      const medianGpsDistanceM=median(sampleDistances)==null?road.distanceM:median(sampleDistances),addressSupport=near.filter(a=>a.streetIndex===road.streetIndex).length,addressRatio=near.length?addressSupport/near.length:0;
      const continuityDistanceM=previousPoint?Math.hypot(road.x-previousPoint.x,road.y-previousPoint.y):null,sameRoad=Boolean(previous&&previous.road&&previous.road.id===road.id);
      const gpsScore=40*Math.max(0,1-medianGpsDistanceM/35),padaScore=30*addressRatio,continuityScore=continuityDistanceM==null?10:20*Math.max(0,1-continuityDistanceM/35),memoryScore=sameRoad?10:0;
      return{road,score:gpsScore+padaScore+continuityScore+memoryScore,medianGpsDistanceM,addressSupport,continuityDistanceM,sameRoad};
    }).sort((a,b)=>b.score-a.score),winner=scored[0]||null,runnerUp=scored[1]||null;
    if(!winner)return{road:null,ranked:[],transition:{status:'UNRESOLVED'}};
    const changed=Boolean(previous&&previous.road&&winner.road.id!==previous.road.id),confirmed=changed&&samples.length>=MIN_CONVERGENCE_SAMPLES&&winner.addressSupport>0&&(!runnerUp||winner.score-runnerUp.score>=5);
    return{road:winner.road,ranked:scored.slice(0,5).map(c=>({roadId:c.road.id,street:c.road.street,score:Number(c.score.toFixed(2)),medianGpsDistanceM:Number(c.medianGpsDistanceM.toFixed(2)),padaAddressSupport:c.addressSupport,continuityDistanceM:c.continuityDistanceM==null?null:Number(c.continuityDistanceM.toFixed(2)),sameRoad:c.sameRoad})),transition:{status:!changed?'SAME_ROAD':confirmed?'ROAD_TRANSITION_CONFIRMED':changed?'ROAD_TRANSITION_CANDIDATE':'ORIGIN',changed,confirmed,minimumSamples:MIN_CONVERGENCE_SAMPLES,observedSamples:samples.length,rule:'PADA_GPS_CONVERGENCE_WITH_PREVIOUS_ANCHOR'}};
  }
  function addressesNear(point,data){const a=[];for(const row of data.addresses){const d=Math.hypot(point.x-row[1],point.y-row[2]);if(d<=35)a.push({id:row[0],x:row[1],y:row[2],streetIndex:row[3],street:data.streets[row[3]],number:row[4],zip:row[5],distanceM:d})}return a.sort((x,y)=>x.distanceM-y.distanceM)}
  function counts(a){return{within35m:a.length,within10m:a.filter(x=>x.distanceM<=10).length,within1m:a.filter(x=>x.distanceM<=1).length,within036m:a.filter(x=>x.distanceM<=.36).length}}
  function anchorStatus(a){if(!a)return'NO_PADA_ANCHOR_IN_35M';if(a.distanceM<=.36)return'ZERA_ANCHOR_CANDIDATE';if(a.distanceM<=1)return'ONE_METER_ANCHOR_CANDIDATE';if(a.distanceM<=10)return'LOCAL_ANCHOR_CANDIDATE';return'TERRITORIAL_ANCHOR_CANDIDATE'}
  function pad(n,w){return String(n).padStart(w,'0')}

  function buildCell(road,data){
    if(!road)return{status:'ZERA_UNRESOLVED'};
    const index=Math.floor(road.chainageFromPartStartM/ZERA_M),startM=index*ZERA_M,endM=Math.min(road.partLengthM,startM+ZERA_M),centerM=(startM+endM)/2;
    const start=pointAt(road.line,startM),center=pointAt(road.line,centerM),end=pointAt(road.line,endM);
    return{status:'ZERA_ESTIMATED',cellId:'ZTS.COCODY.R'+pad(road.id,4)+'.P'+pad(road.partIndex,2)+'.Z'+pad(index,6),territory:'COCODY',roadId:road.id,street:road.street,partIndex:road.partIndex,indexFromCanonicalPartStart:index,cellLengthM:ZERA_M,boundsM:{start:startM,end:endM},offsetWithinCellM:road.chainageFromPartStartM-startM,geometry:{crs:'EPSG:32630',start,center,end,centerWgs84:utm30ToWgs84(center.x,center.y)},validation:{status:'COMPUTED_REFERENCE',groundTruthConfirmed:false,rule:'CELL_EXISTS_IN_REFERENCE_BUT_ACTIVE_PRESENCE_IS_ESTIMATED'},territorialObjects:{capacity:'MULTIPLE',count:0,items:[]},provenance:{library:data.schema,libraryVersion:data.version,resolverVersion:VERSION,geometryRule:'CANONICAL_PART_ENDPOINT_ORDER'}};
  }

  function resolve(input){
    const data=input.data||root.TERRITORIAL_ANCHOR_DATA;if(!data)return{engine:'Territorial Anchor Resolver™',version:VERSION,status:'LIBRARY_UNAVAILABLE'};
    const lat=Number(input.lat),lon=Number(input.lon),accuracy=input.accuracyM==null?null:Number(input.accuracyM);if(!Number.isFinite(lat)||!Number.isFinite(lon))return{engine:'Territorial Anchor Resolver™',version:VERSION,status:'INVALID_COORDINATES'};
    const raw=wgs84ToUtm30(lat,lon),samples=normalizeSamples(input,lat,lon,accuracy),observation=robustObservation(samples),near=addressesNear(observation,data),previous=input.previous&&input.previous.territorialAnchor,selection=selectRoad(observation,samples,near,data,previous),road=selection.road,roadUsable=Boolean(road&&road.distanceM<=Math.max(35,accuracy||0)),address=(road&&near.find(a=>a.streetIndex===road.streetIndex))||near[0]||null,resolved=roadUsable?{x:road.x,y:road.y,crs:'EPSG:32630',method:'PADA_MULTI_SAMPLE_ROAD_PROJECTION'}:{x:observation.x,y:observation.y,crs:'EPSG:32630',method:'ROBUST_GPS_CLUSTER'},cell=buildCell(roadUsable?road:null,data);
    const pp=previous&&previous.resolvedPosition,rawCycle=pp?Math.hypot(resolved.x-pp.x,resolved.y-pp.y):null,factor=Number.isFinite(Number(input.calibrationFactor))?Number(input.calibrationFactor):1;
    const sameRoad=Boolean(previous&&previous.road&&road&&previous.road.id===road.id),samePart=Boolean(sameRoad&&previous.road.partIndex===road.partIndex);
    const cellDelta=samePart&&previous.zeraCell&&Number.isFinite(previous.zeraCell.indexFromCanonicalPartStart)&&Number.isFinite(cell.indexFromCanonicalPartStart)?cell.indexFromCanonicalPartStart-previous.zeraCell.indexFromCanonicalPartStart:null;
    const continuity={distanceFromPreviousM:rawCycle,distanceFromPreviousZera:rawCycle==null?null:rawCycle/ZERA_M,calibratedDistanceFromPreviousM:rawCycle==null?null:rawCycle*factor,calibratedDistanceFromPreviousZera:rawCycle==null?null:rawCycle*factor/ZERA_M,calibrationFactor:factor,sameRoad:sameRoad,sameCanonicalPart:samePart,cellTransition:previous&&previous.zeraCell&&cell.cellId?{from:previous.zeraCell.cellId,to:cell.cellId,changed:previous.zeraCell.cellId!==cell.cellId,signedCellDelta:cellDelta,absoluteCellsCrossed:cellDelta==null?null:Math.abs(cellDelta),canonicalDirection:cellDelta===null||cellDelta===0?'STABLE':cellDelta>0?'FORWARD':'REVERSE'}:null};
    let score=address?Math.max(0,50-address.distanceM/35*50):0;if(road&&road.distanceM<=10)score+=15;if(address&&road&&address.streetIndex===road.streetIndex)score+=20;if(continuity.sameRoad)score+=10;score=Math.min(100,Math.round(score));
    return{engine:'Territorial Anchor Resolver™',version:VERSION,status:anchorStatus(address),generatedAt:new Date().toISOString(),source:{library:data.schema,libraryVersion:data.version,crs:data.source.crs,addressCount:data.addresses.length,roadCount:data.roads.length},gpsInput:{lat,lon,accuracyM:accuracy,utm:raw},observationFusion:{sampleCount:observation.sampleCount,inlierCount:observation.inlierCount,rejectedCount:observation.rejectedCount,medianSpreadM:observation.medianSpreadM,maxSpreadM:observation.maxSpreadM,method:observation.method,centerUtm:{x:observation.x,y:observation.y,crs:observation.crs},padaAuthority:'PRIMARY_FIXED_REFERENCE',gpsRole:'OBSERVATION_AND_PRESENCE_SENSOR'},search:{radiiM:RADII,counts:counts(near),candidates:near.slice(0,12)},selectedAddress:address,road:road?Object.assign({},road,{line:undefined}):null,roadResolution:{rankedCandidates:selection.ranked,transition:selection.transition},resolvedPosition:resolved,continuity,zeraCell:cell,confidence:{score,level:score>=80?'HIGH':score>=55?'MEDIUM':score>=30?'LOW':'INSUFFICIENT',rule:'MULTI_SAMPLE_PADA_CONTINUITY_CANDIDATE_NOT_GROUND_TRUTH'}};
  }
  root.TerritorialAnchorResolver=Object.freeze({version:VERSION,zeraMeters:ZERA_M,radiiM:RADII.slice(),minimumConvergenceSamples:MIN_CONVERGENCE_SAMPLES,wgs84ToUtm30,utm30ToWgs84,resolve});
})(typeof window!=='undefined'?window:globalThis);
