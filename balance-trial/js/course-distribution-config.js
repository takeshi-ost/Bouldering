'use strict';
// The score controls generation probabilities, not a sum of selected features.
// Rows: score and weights in the order of values. Endpoint weights are normalized
// before interpolation. Change version whenever these tables change.
const CourseDistributionConfig = globalThis.CourseDistributionConfig = {
 version: '6',
 // Keep all existing streams; the joint trial uses additional named streams.
 randomVersion: '3',
 // v6 preserves legacy length/profile draws; only feature presence is balanced.
 balance: {exclusiveMaxScore:20,shortHeartCap:1},
 // Whole-course presence probabilities, not heart counts or spike percentages.
 // Preserve the base tables below for positive-feature conditionals and rejoining.
 jointTrial: {
  startScore: 10, endScore: 40, rejoinScore: 60,
  start: {heart: .20, spike: .28, both: .04},
  end: {heart: .655, spike: .30, both: .04}
 },
 tables: {
  length: {values:['short','middle','long'], rows:[
   {score:0,weights:[90,10,0]}, {score:5,weights:[90,10,0]},
   {score:30,weights:[30,60,10]}, {score:40,weights:[10,30,60]}, {score:100,weights:[5,25,70]}
  ]},
  composition: {values:['single','pair'], rows:[{score:0,weights:[1,1]},{score:100,weights:[1,1]}]},
  profile: {values:['straight','meander','contrast','branch','switchback'], rows:[
   {score:0,weights:[1,0,0,0,0]}, {score:10,weights:[1,0,0,0,0]},
   {score:15,weights:[1,1,1,0,0]}, {score:20,weights:[1,1,1,0,0]},
   {score:25,weights:[1,1,1,1,1]}, {score:100,weights:[1,1,1,1,1]}
  ]},
  hearts: {values:[0,1,2,3], rows:[
   {score:0,weights:[1,0,0,0]}, {score:3,weights:[1,0,0,0]},
   {score:10,weights:[1,10,0,0]}, {score:30,weights:[2,2,3,0]}, {score:40,weights:[1,1,1,1]}, {score:100,weights:[1,1,1,1]}
  ]},
  spikes: {values:[0,10,20,30], rows:[
   {score:0,weights:[100,0,0,0]}, {score:5,weights:[100,0,0,0]},
   {score:20,weights:[70,30,0,0]},
   {score:50,weights:[70,30,0,0]}, {score:75,weights:[15,25,40,20]}, {score:100,weights:[5,15,40,40]}
  ]}
 }
};
