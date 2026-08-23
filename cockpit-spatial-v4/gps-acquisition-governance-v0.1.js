/* GPS Acquisition Governance™ v0.1
 * Une coordonnee recue n'est pas une position convergente.
 * La validation exige plusieurs prises fraiches, une duree minimale et
 * une fenetre temporelle suffisante avant de lancer les moteurs. Une coordonnee
 * exactement repetee est un signal de stabilite valide, pas un blocage.
 */
(function(root){
  'use strict';

  const VERSION='0.1.0';
  const DEFAULTS=Object.freeze({
    minimumSamples:4,
    minimumDurationMs:1500,
    minimumUniqueCoordinates:1,
    maximumMedianSpreadM:8
  });

  function number(value){const n=Number(value);return Number.isFinite(n)?n:null}
  function median(values){
    if(!values.length)return null;
    const ordered=values.slice().sort((a,b)=>a-b),middle=Math.floor(ordered.length/2);
    return ordered.length%2?ordered[middle]:(ordered[middle-1]+ordered[middle])/2;
  }
  function distanceM(a,b){
    const radius=6371008.8,toRad=value=>value*Math.PI/180;
    const p1=toRad(a.lat),p2=toRad(b.lat),dp=toRad(b.lat-a.lat),dl=toRad(b.lon-a.lon);
    const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*radius*Math.asin(Math.sqrt(h));
  }
  function normalize(samples){
    return (Array.isArray(samples)?samples:[]).map((sample,index)=>({
      index,
      lat:number(sample.lat==null?sample.latitude:sample.lat),
      lon:number(sample.lon==null?sample.longitude:sample.lon),
      accuracyM:number(sample.accuracyM==null?sample.accuracy:sample.accuracyM),
      capturedAt:sample.capturedAt||null,
      capturedMs:sample.capturedAt?Date.parse(sample.capturedAt):null
    })).filter(sample=>sample.lat!==null&&sample.lon!==null);
  }
  function evaluate(samples,options){
    const opts=Object.assign({},DEFAULTS,options||{}),all=normalize(samples);
    const startedMs=opts.startedAt?Date.parse(opts.startedAt):null;
    const fresh=Number.isFinite(startedMs)?all.filter(sample=>Number.isFinite(sample.capturedMs)&&sample.capturedMs>=startedMs):all;
    const times=fresh.map(sample=>sample.capturedMs).filter(Number.isFinite);
    const durationMs=times.length>1?Math.max.apply(null,times)-Math.min.apply(null,times):0;
    const uniqueCount=new Set(fresh.map(sample=>sample.lat.toFixed(7)+'|'+sample.lon.toFixed(7))).size;
    const center=fresh.length?{lat:median(fresh.map(sample=>sample.lat)),lon:median(fresh.map(sample=>sample.lon))}:null;
    const residuals=center?fresh.map(sample=>distanceM(sample,center)):[];
    const medianSpreadM=median(residuals)||0;
    const medianAccuracyM=median(fresh.map(sample=>sample.accuracyM).filter(value=>value!==null));
    const adaptiveLimitM=medianAccuracyM==null?opts.maximumMedianSpreadM:Math.max(2,Math.min(opts.maximumMedianSpreadM,medianAccuracyM*.5));
    const enoughSamples=fresh.length>=opts.minimumSamples;
    const enoughDuration=durationMs>=opts.minimumDurationMs;
    const enoughUnique=uniqueCount>=opts.minimumUniqueCoordinates;
    const convergent=fresh.length>1&&medianSpreadM<=adaptiveLimitM;
    const authorized=enoughSamples&&enoughDuration&&enoughUnique&&convergent;
    let status='GPS_NOT_RECEIVED';
    if(fresh.length)status='GPS_RECEIVED_NOT_STABLE';
    if(enoughSamples&&!enoughDuration)status='GPS_WAITING_FOR_FRESH_DURATION';
    else if(enoughSamples&&!enoughUnique)status='GPS_REPEATED_COORDINATE';
    else if(enoughSamples&&!convergent)status='GPS_UNSTABLE';
    else if(authorized)status='GPS_CONVERGENT';
    return{
      engine:'GPS Acquisition Governance™',version:VERSION,status,validationAuthorized:authorized,
      sampleCount:all.length,freshSampleCount:fresh.length,minimumSamples:opts.minimumSamples,
      durationMs,minimumDurationMs:opts.minimumDurationMs,uniqueCoordinateCount:uniqueCount,
      minimumUniqueCoordinates:opts.minimumUniqueCoordinates,medianSpreadM,medianAccuracyM,
      stabilityLimitM:adaptiveLimitM,center,rule:'FRESH_MULTI_SAMPLE_CONVERGENCE_BEFORE_PIPELINE'
    };
  }

  root.GPSAcquisitionGovernance=Object.freeze({version:VERSION,defaults:DEFAULTS,evaluate,distanceM});
})(typeof window!=='undefined'?window:globalThis);
