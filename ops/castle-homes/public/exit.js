const match=/\/castle-homes\/view\/([a-f0-9-]{36})\/$/.exec(location.pathname);
if(match&&window.parent!==window)window.parent.postMessage({type:'castle-home-close',view:match[1]},location.origin);
