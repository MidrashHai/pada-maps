'use strict';
const assert=require('assert');
const core=require('./trajectory-test-bench-v0.2.js');
function obs(z,lat,lon){return {observationId:'P'+z,lat,lon,observedZera:'R.Z'+z,candidateZera:'R.Z'+z,supportedZera:'R.Z'+z,governedZera:'R.Z'+z,territorialAnchor:{road:{id:'R1'}},rawEngineObservation:{}};}
function witness(crossings,meters,type='CONTINUOUS'){return {witnessId:'W1',startMarker:'A',endMarker:'B',realDistanceM:meters,realZera:meters/.36,direction:type==='IMMOBILE'?'IMMOBILE':'STREET_FORWARD',movementType:type,measurementMethod:'TAPE_MEASURE',expectedBoundaryCrossings:crossings,confidence:'HIGH',capturedAt:new Date().toISOString(),note:''};}
assert.equal(core.validateFieldWitness(witness(2,.72)).valid,true);
assert.equal(core.validateFieldWitness({...witness(0,0),realZera:2}).valid,false);
let t=core.buildTransitionEvidence([obs(10,5,-3),obs(11,5.000001,-3),obs(12,5.000002,-3)],witness(2,.72));
assert.equal(t.items.length,2);assert.equal(t.items.every(x=>x.status==='SUPPORTED'),true);
let result=core.evaluateSeries({testId:'T004',fieldWitness:witness(2,.72),sensorObservations:[obs(10,5,-3),obs(11,5.000001,-3),obs(12,5.000002,-3)]});
assert.equal(result.verdictCode,'PASS');assert.equal(result.distanceState.governedDistanceM,.72);
result=core.evaluateSeries({testId:'T003',fieldWitness:witness(0,0,'IMMOBILE'),sensorObservations:[obs(10,5,-3),{...obs(50,5.0002,-3),governedZera:'R.Z10'}]});
assert.equal(result.verdictCode,'PASS');assert.equal(result.distanceState.governedDistanceM,0);
result=core.evaluateSeries({testId:'UI002',actionLog:[{actionId:'A1',status:'SUCCESS'}],acquisitionWindows:[{acquisitionId:'W1'}],sensorObservations:[obs(10,5,-3)]});
assert.equal(result.verdictCode,'PASS');
result=core.evaluateSeries({testId:'UI001',actionLog:[{actionId:'A1',status:'SUCCESS'},{actionId:'A1',status:'SUCCESS'}],acquisitionWindows:[],sensorObservations:[]});
assert.equal(result.verdictCode,'FAIL');assert.equal(result.failureStage,'UI_TRANSACTION_FAILED');
console.log('Territorial Evidence Test Bench v4.2: 12 assertions PASS');
