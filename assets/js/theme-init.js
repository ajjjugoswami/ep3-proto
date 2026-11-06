(function () {
    var stored = null;
    try { stored = localStorage.getItem('ep3.firms.prototype.theme'); } catch (e) { }
    document.documentElement.dataset.theme = stored === 'dark' ? 'dark' : 'light';
  })();
