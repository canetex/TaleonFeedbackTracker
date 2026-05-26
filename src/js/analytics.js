// src/js/analytics.js — Google Analytics 4 (só carrega se gaMeasurementId estiver no runtime-config)
(function initGoogleAnalytics() {
  const measurementId = window.TALEON_CONFIG?.gaMeasurementId;
  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId, {
    anonymize_ip: true,
    send_page_view: true,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
})();
