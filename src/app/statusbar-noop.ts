// Web-side no-op stub for Capacitor StatusBar plugin
// Ensures any runtime calls to StatusBar become no-ops in the web layer.
(function () {
  try {
    const win: any = window as any;
    if (!win) return;

    const noopAsync = async function () {
      return {};
    };

    const statusBarStub = {
      setBackgroundColor: noopAsync,
      setStyle: noopAsync,
      setOverlaysWebView: noopAsync,
      show: noopAsync,
      hide: noopAsync,
      getInfo: async () => ({ visible: true }),
    };

    if (win.Capacitor) {
      if (!win.Capacitor.Plugins) win.Capacitor.Plugins = {};
      win.Capacitor.Plugins.StatusBar = statusBarStub;
    }

    // Some code references window.StatusBar directly
    win.StatusBar = statusBarStub;
  } catch (e) {
    // ignore
  }
})();
