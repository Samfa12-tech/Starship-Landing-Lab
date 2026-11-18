import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,DEFAULT_TUNING,PRESETS,freshState,simulate} from '../physics.js';
test('balanced controller produces a soft upright landing',()=>{
 const {state,samples}=simulate(DEFAULT_TUNING);
 assert.equal(state.phase,'landed',state.outcome);
 assert.ok(samples.length>20);
 assert.equal(state.h,0);
 assert.ok(state.time<150);
});
test('hot preset crashes as expected',()=>assert.equal(simulate(PRESETS.hot).state.phase,'crashed'));
test('ready flights remain stationary',()=>{const s=freshState();assert.deepEqual(advance(s,DEFAULT_TUNING),s);});
test('fixed-step simulator is deterministic',()=>assert.deepEqual(simulate(DEFAULT_TUNING).state,simulate(DEFAULT_TUNING).state));
