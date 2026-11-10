(()=>{
  'use strict';
  // Install before iframe_api: these two helper pages never own native popups.
  window.addEventListener('message',event=>{
    if(window.parent!==window&&event.source===window.parent&&event.origin===location.origin&&event.data?.type==='buttonClickedEvent')event.stopImmediatePropagation();
  },true);
})();
