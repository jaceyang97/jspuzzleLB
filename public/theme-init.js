(function () {
  var theme;
  try { theme = localStorage.getItem('theme'); } catch (error) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.innerWidth > 768 && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1c1c1e' : '#ffffff';
  var icon = theme === 'dark' ? 'js_puzzle_solver_logo_dark.svg' : 'js_puzzle_solver_logo.svg';
  document.getElementById('site-icon').href = new URL(icon, document.currentScript.src).href;
})();
