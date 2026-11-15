'use strict';
// Preparation only: not imported into a shipped runtime until reviewed terms
// and per-service regional bases are configured. Never infer a permission.
function servicePermissions({reviewedVersion,acceptedVersion,bases={},analyticsChoice='unset',advertising={}}={}) {
 const terms=typeof reviewedVersion==='string' && reviewedVersion.length>0 && acceptedVersion===reviewedVersion;
 const analytics=terms;
 const ads=terms && bases.advertising===true && advertising.updated===true && advertising.canRequest===true && advertising.networkEligible===true;
 return Object.freeze({
  online:terms && bases.online===true,
  courses:terms && bases.courses===true,
  ump:terms && bases.ump===true,
  analytics,
  advertising:ads,
  // Normal first-run acceptance NEVER grants cross-service/personalized use.
  personalizedAdvertising:ads && advertising.personalizationChoice==='granted' && bases.personalization===true
 });
}
module.exports={servicePermissions};
