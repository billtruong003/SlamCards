// Trailers open in place (YouTube's reduced-cookie player). Without this script, or without
// <dialog>, the Trailer links still open the video on YouTube.
(() => {
  const dialog = document.querySelector('dialog.video');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const frame = dialog.querySelector('.frame');

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-yt]');
    if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(link.dataset.yt)}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = link.dataset.name || 'Trailer';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
    dialog.showModal();
  });

  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => frame.replaceChildren());
})();
