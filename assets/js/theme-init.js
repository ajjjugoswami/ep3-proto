(function () {
    var stored = null;
    try { stored = localStorage.getItem('ep3.firms.prototype.theme'); } catch (e) { }
    document.documentElement.dataset.theme = stored === 'light' || stored === 'dark' ? stored : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  })();
