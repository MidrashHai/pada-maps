const assert=require('assert');
const core=require('./ztls-territorial-resolution-v4.3.js');
function raw(z,s){return {point:{lat:5.38,lon:-3.95},accuracy:11,territorialAnchor:{road:{street:'RUE TANO ATCHIMON',chainageFromPartStartM:s},selectedAddress:{number:99},zeraCell:{cellId:'ZTS.COCODY.R11895.P00.Z'+String(z).padStart(6,'0'),offsetWithinCellM:s%0.36},gpsInput:{lat:5.38,lon:-3.95,accuracyM:11},observationFusion:{sampleCount:16,medianSpreadM:4}},territorialStateEstimation:{zeraBeliefSet:{estimatedZeraId:'ZTS.COCODY.R11895.P00.Z'+String(z).padStart(6,'0')},governedPresenceState:{governedZeraId:'ZTS.COCODY.R11895.P00.Z'+String(z).padStart(6,'0')}}};}
const a=core.makeObservation('G01','S1',raw(20,7.2),null);
const b=core.makeObservation('G01','S1',raw(60,21.6),a);
assert(Object.isFrozen(a));
assert.equal(core.calculateSegment(a,b).zeraCount,40);
assert(Math.abs(core.calculateSegment(a,b).distanceM-14.4)<1e-9);
const judged=core.addHumanWitness(b,{confirmed:true,actualZera:60,estimatedMovementCm:1440,movementObserved:true});
assert.equal(judged.systemResolution.governedZera,b.systemResolution.governedZera);
assert.equal(judged.comparison.zeraConvergence,true);
assert.throws(()=>core.addHumanWitness(judged,{confirmed:false}),/WITNESS_ALREADY_RECORDED/);
assert.equal(core.nextAllowed('G01','INCONNU','CONTEXT_RESOLVED'),true);
assert.equal(core.nextAllowed('G01','INCONNU','ANCHOR_A_SEALED'),false);
console.log('ZT­LS v4.3: 8 assertions passed');
