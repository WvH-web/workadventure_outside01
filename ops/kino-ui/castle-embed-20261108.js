(() => {
  const root = document.documentElement;
  root.dataset.kinoTheme = 'castle';
  if (window.self !== window.top || new URLSearchParams(location.search).get('embed') === 'castle') {
    root.dataset.kinoEmbedded = 'true';
  }
  const reload = document.getElementById('reloadBtn');
  if (reload) {
    reload.setAttribute('aria-label', 'Kino neu laden');
    reload.title = 'Kino neu laden';
  }
  const chat = document.getElementById('chatToggle');
  if (chat) chat.title = 'Publikumschat ein- oder ausblenden';
  if (document.body.classList.contains('liveMode')) {
    const metadata = document.querySelector('.card')?.firstElementChild;
    if (metadata) metadata.classList.add('kino-film-meta');
  } else if (document.getElementById('cd') && document.querySelector('.heroMarquee')) {
    document.querySelector('.card')?.firstElementChild?.classList.add('kino-waiting-meta');
  }
})();
