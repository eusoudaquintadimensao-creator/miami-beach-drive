// Detecta o aparelho (celular x computador, Android x iPhone) para escolher padrões leves ou caprichados.
const ua = navigator.userAgent || '';
const coarse = matchMedia('(pointer: coarse)').matches;
const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const android = /Android/i.test(ua);
const minSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
const tablet = (ios && /iPad|Macintosh/.test(ua)) || (android && !/Mobile/i.test(ua)) || (coarse && minSide >= 700);
const phone = !tablet && (ios || android || /Mobi/i.test(ua) || (coarse && minSide < 700));
export const DEVICE = {
  ios, android, phone, tablet, mobile: phone || tablet, desktop: !(phone || tablet),
  touch: coarse || ('ontouchstart' in window && navigator.maxTouchPoints > 0),
  cores: navigator.hardwareConcurrency || 4, mem: navigator.deviceMemory || (ios ? 4 : 4),
  dpr: devicePixelRatio || 1,
  get label() { return (this.phone ? 'Celular' : this.tablet ? 'Tablet' : 'Computador') + (this.ios ? ' · iPhone/iPad' : this.android ? ' · Android' : ''); },
};
document.documentElement.classList.add(DEVICE.mobile ? 'is-mobile' : 'is-desktop');
if (ios) document.documentElement.classList.add('is-ios'); if (android) document.documentElement.classList.add('is-android');
