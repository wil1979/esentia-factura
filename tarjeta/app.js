/* ============================================
EWE ESSENTIA v10 — Arquitectura Modular
Preview = Print (misma fuente de verdad)
+ Descarga de imágenes + Una sola cara
+ Fix decoraciones en preview
+ Fix imagen de fondo
============================================ */

const CONFIG = {
  defaults: {
    name: 'Wilber Calderón M', title: 'ADMINISTRADOR', phone: '72952454',
    whatsapp: '+506 72952454', email: 'eweesentia@gmail.com',
    qr: 'https://wa.me/50672952454',
    tagline: 'Fragancias Aromáticas\nAmbientales & Velas',
    footerCenter: 'Catálogo\nde Productos',
    accent: '#C9A84C', bg: '#FFFFFF', footer: '#F5F5F5',
    text: '#2C2C2C', muted: '#666666', bgCss: '#FFFFFF',
    font: 'Dancing Script', useLogoSvg: true,
    logoUrl: 'https://wil1979.github.io/esentia-factura/images/logo.png',
    logoSize: 190, essentiaSize: 52, titleSize: 13, nameSize: 22,
    taglineSize: 13, phoneSize: 14, emailSize: 14, footerSize: 11, qrLabelSize: 11,
    showDecorations: false, showFoliage: false, showShapes: false,
    showTexture: false, showVignette: false,
    bgImageUrl: '', bgImageOpacity: 30, bgImagePosition: 'center'
  },
  pageSizes: {
    A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 },
    Legal: { w: 215.9, h: 355.6 }, A3: { w: 297, h: 420 }
  },
  cardSizes: {
    '85x55': { w: 85, h: 55 }, '90x50': { w: 90, h: 50 },
    '88x55': { w: 88, h: 55 }, '3.5x2': { w: 88.9, h: 50.8 }
  },
  googleFontMap: {
    'Dancing Script': "'Dancing Script', cursive",
    'Great Vibes': "'Great Vibes', cursive",
    'Parisienne': "'Parisienne', cursive",
    'Allura': "'Allura', cursive",
    'Tangerine': "'Tangerine', cursive"
  },
  icons: {
    user: '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
    email: '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    leaf: '<svg viewBox="0 0 24 24"><path d="M12,22c4.97,0,9-4.03,9-9c-4.97,0-9-4.03-9-9c-4.97,0-9,4.03-9,9C3,17.97,7.03,22,12,22z M12,4c3.87,0,7,3.13,7,7s-3.13,7-7,7s-7-3.13-7-7S8.13,4,12,4z"/><circle cx="12" cy="11" r="3"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24"><path d="M16.75 13.96c.25.13.41.2.46.3.06.11.04.61-.21 1.18-.2.56-1.24 1.1-2.2 1.1-.95 0-1.8-.45-2.05-1.05-.25-.6-.1-1.2.35-1.65.45-.45 1.15-.75 1.85-.75.7 0 1.3.25 1.65.65.35.4.35.95.15 1 .22zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>',
    catalog: '<svg viewBox="0 0 24 24"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12zm-7-8c-1.66 0-3-1.34-3-3h2c0 .55.45 1 1 1s1-.45 1-1h2c0 1.66-1.34 3-3 3z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    mobile: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>'
  }
};

const State = {
  data: {}, qrDataUrl: '', bgImageDataUrl: '',
  init() { this.data = { ...CONFIG.defaults }; this.loadFromDOM(); },
  loadFromDOM() {
    const map = {
      name:'inp-name', title:'inp-title', phone:'inp-phone', whatsapp:'inp-whatsapp',
      email:'inp-email', qr:'inp-qr', tagline:'inp-tagline', footerCenter:'inp-footer-center',
      accent:'inp-accent', bg:'inp-bg', footer:'inp-footer', text:'inp-text',
      muted:'inp-muted', bgCss:'inp-bg-css', font:'inp-font', logoUrl:'inp-logo-url',
      logoSize:'inp-logo-size', essentiaSize:'inp-essentia-size', titleSize:'inp-title-size',
      nameSize:'inp-name-size', taglineSize:'inp-tagline-size', phoneSize:'inp-phone-size',
      emailSize:'inp-email-size', footerSize:'inp-footer-size', qrLabelSize:'inp-qr-label-size',
      showDecorations:'inp-show-decorations', showFoliage:'inp-show-foliage',
      showShapes:'inp-show-shapes', showTexture:'inp-show-texture', showVignette:'inp-show-vignette',
      bgImageUrl:'inp-bg-image-url', bgImageOpacity:'inp-bg-image-opacity', bgImagePosition:'inp-bg-image-position'
    };
    for (const [key,id] of Object.entries(map)) {
      const el = document.getElementById(id); if (!el) continue;
      if (el.type==='checkbox') this.data[key]=el.checked;
      else if (el.type==='number'||el.type==='range') this.data[key]=parseInt(el.value)||CONFIG.defaults[key];
      else this.data[key]=el.value;
    }
    const useLogoSvg = document.getElementById('inp-use-logo');
    if (useLogoSvg) this.data.useLogoSvg = !useLogoSvg.checked;
  },
  get() { return this.data; },
  set(key,value) {
    this.data[key]=value;
    const id='inp-'+key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase());
    const el=document.getElementById(id); if(el){if(el.type==='checkbox')el.checked=value;else el.value=value;}
  }
};

const Utils = {
  lightenColor(hex,p){
    const n=parseInt(hex.slice(1),16),a=Math.round(2.55*p);
    const r=Math.min(255,(n>>16)+a),g=Math.min(255,((n>>8)&255)+a),b=Math.min(255,(n&255)+a);
    return '#'+((1<<24)+r*65536+g*256+b).toString(16).slice(1);
  },
  darkenColor(hex,p){
    const n=parseInt(hex.slice(1),16),a=Math.round(2.55*p);
    const r=Math.max(0,(n>>16)-a),g=Math.max(0,((n>>8)&255)-a),b=Math.max(0,(n&255)-a);
    return '#'+((1<<24)+r*65536+g*256+b).toString(16).slice(1);
  },
  escapeHtml(text){const d=document.createElement('div');d.textContent=text;return d.innerHTML;},
  generateFileName(prefix){
    const now=new Date(),ds=now.toISOString().slice(0,10).replace(/-/g,'');
    const ts=String(now.getHours()).padStart(2,'0')+String(now.getMinutes()).padStart(2,'0');
    return 'ewe-esentia-'+prefix+'-'+ds+'-'+ts+'.png';
  }
};

const CardRenderer = {
  render(side, mode) {
    const s = State.get();
    return side === 'front' ? this._renderFront(s, mode === 'print') : this._renderBack(s, mode === 'print');
  },

  _renderFront(s, isPrint) {
    const tagline = Utils.escapeHtml(s.tagline).replace(/\n/g, '<br>');
    const fontScript = CONFIG.googleFontMap[s.font] || "'Dancing Script', cursive";
    const accentLight = Utils.lightenColor(s.accent, 30);
    const accentDark = Utils.darkenColor(s.accent, 20);

    let logoHtml = '';
    if (!s.useLogoSvg && s.logoUrl) {
      logoHtml = '<div class="logo-img active" style="width:' + s.logoSize + 'px;height:' + Math.round(s.logoSize * 1.22) + 'px;"><img src="' + Utils.escapeHtml(s.logoUrl) + '" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));display:block;" alt="Logo"></div>';
    } else {
      logoHtml = '<div class="logo-svg" style="width:' + s.logoSize + 'px;height:' + Math.round(s.logoSize * 1.22) + 'px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.4));">' + this._getLogoSVG(s) + '</div>';
    }

    const decoHtml = this._getDecorationHtml('front', s);
    const bgImageHtml = this._getBgImageHtml(s);

    if (isPrint) {
      return '<div class="card card--front" style="background:' + s.bgCss + ';border-radius:3mm;position:relative;overflow:hidden;width:100%;height:100%;">' +
        bgImageHtml +
        '<div style="position:absolute;inset:0;background:' + s.bg + ';z-index:0;"></div>' +
        decoHtml +
        '<div style="position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:6mm;">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:2mm;">' + logoHtml +
            '<div style="text-align:center;display:flex;flex-direction:column;align-items:center;">' +
              '<span style="font-family:\'Cormorant Garamond\',serif;font-size:16px;font-weight:700;letter-spacing:2.5mm;color:' + s.accent + ';text-transform:uppercase;line-height:1;">EWE Esentia</span>' +
              '<span style="font-family:' + fontScript + ';font-size:' + Math.round(s.essentiaSize * 0.6) + 'px;color:' + s.accent + ';line-height:0.9;margin-top:-1mm;letter-spacing:0.5px;background:linear-gradient(180deg, ' + accentLight + ' 0%, ' + s.accent + ' 60%, ' + accentDark + ' 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;"></span>' +
              '<div style="display:flex;align-items:center;gap:2mm;margin:2.5mm 0 2mm;width:100%;justify-content:center;"><span style="width:15mm;height:0.4mm;background:linear-gradient(90deg, transparent, ' + s.accent + ', transparent);position:relative;"><span style="position:absolute;width:1.5mm;height:1.5mm;background:' + s.accent + ';border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);box-shadow:0 0 2mm rgba(201,168,76,0.4);"></span></span></div>' +
              '<p style="font-family:\'Montserrat\',sans-serif;font-size:' + Math.round(s.taglineSize * 0.6) + 'px;color:' + s.muted + ';line-height:1.5;letter-spacing:0.5mm;text-transform:uppercase;font-weight:300;">' + tagline + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="card card--front" id="card-front-bg" style="background:' + s.bgCss + ';">' +
      bgImageHtml +
      '<div class="card__bg"></div>' +
      decoHtml +
      '<div class="front-content">' +
        '<div class="logo-area">' + logoHtml +
          '<div class="brand">' +
            '<span class="brand__ewe" style="color:' + s.accent + ';">EWE Esentia</span>' +
            '<span class="brand__essentia" id="brand-essentia" style="font-family:' + fontScript + ';font-size:' + s.essentiaSize + 'px;background:linear-gradient(180deg, ' + accentLight + ' 0%, ' + s.accent + ' 60%, ' + accentDark + ' 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;"></span>' +
            '<div class="brand__divider"><span style="background:linear-gradient(90deg, transparent, ' + s.accent + ', transparent);"><span style="background:' + s.accent + ';box-shadow:0 0 8px ' + s.accent + ';"></span></span></div>' +
            '<p class="brand__tagline" id="front-tagline" style="color:' + s.muted + ';font-size:' + s.taglineSize + 'px;">' + tagline + '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  },

  _renderBack(s, isPrint) {
    const tagline = Utils.escapeHtml(s.tagline).replace(/\n/g, '<br>');
    const name = Utils.escapeHtml(s.name);
    const title = Utils.escapeHtml(s.title);
    const phone = Utils.escapeHtml(s.phone);
    const email = Utils.escapeHtml(s.email);
    const whatsapp = Utils.escapeHtml(s.whatsapp);
    const footerCenter = Utils.escapeHtml(s.footerCenter).replace(/\n/g, '<br>');
    const accentDark = Utils.darkenColor(s.accent, 20);

    const decoHtml = this._getDecorationHtml('back', s);
    const bgImageHtml = this._getBgImageHtml(s);

    if (isPrint) {
      return '<div class="card card--back" style="background:' + s.bgCss + ';border-radius:3mm;position:relative;overflow:hidden;width:100%;height:100%;">' +
        bgImageHtml +
        '<div style="position:absolute;inset:0;background:' + s.bg + ';z-index:0;"></div>' +
        decoHtml +
        '<div style="position:relative;z-index:10;display:flex;height:100%;padding:5mm 6mm 14mm;gap:5mm;">' +
          '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:3mm;">' +
            '<div style="display:flex;align-items:flex-start;gap:3mm;">' +
              '<div style="width:7mm;height:7mm;min-width:7mm;border-radius:50%;border:0.4mm solid ' + s.accent + ';display:flex;align-items:center;justify-content:center;margin-top:0.5mm;background:rgba(201,168,76,0.05);">' + CONFIG.icons.user + '</div>' +
              '<div style="display:flex;flex-direction:column;gap:0.5mm;padding-top:0.5mm;">' +
                '<div style="font-family:\'Cormorant Garamond\',serif;font-size:' + Math.round(s.nameSize * 0.6) + 'px;font-weight:700;color:' + s.accent + ';letter-spacing:0.5px;">' + name + '</div>' +
                '<div style="font-size:' + Math.round(s.titleSize * 0.6) + 'px;color:' + s.muted + ';letter-spacing:1.2mm;text-transform:uppercase;font-weight:500;margin-top:0.5mm;">' + title + '</div>' +
                '<div style="width:100%;height:0.3mm;background:linear-gradient(90deg, ' + s.accent + ', transparent);margin-top:1.5mm;opacity:0.4;"></div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:flex-start;gap:3mm;">' +
              '<div style="width:7mm;height:7mm;min-width:7mm;border-radius:50%;border:0.4mm solid ' + s.accent + ';display:flex;align-items:center;justify-content:center;margin-top:0.5mm;background:rgba(201,168,76,0.05);">' + CONFIG.icons.phone + '</div>' +
              '<div style="display:flex;flex-direction:column;gap:0.5mm;padding-top:0.5mm;"><div style="font-size:' + Math.round(s.phoneSize * 0.6) + 'px;color:' + s.text + ';font-weight:400;line-height:1.4;">' + phone + '</div></div>' +
            '</div>' +
            '<div style="display:flex;align-items:flex-start;gap:3mm;">' +
              '<div style="width:7mm;height:7mm;min-width:7mm;border-radius:50%;border:0.4mm solid ' + s.accent + ';display:flex;align-items:center;justify-content:center;margin-top:0.5mm;background:rgba(201,168,76,0.05);">' + CONFIG.icons.email + '</div>' +
              '<div style="display:flex;flex-direction:column;gap:0.5mm;padding-top:0.5mm;"><div style="font-size:' + Math.round(s.emailSize * 0.6) + 'px;color:' + s.text + ';font-weight:400;line-height:1.4;">' + email + '</div></div>' +
            '</div>' +
            '<div style="display:flex;align-items:flex-start;gap:3mm;">' +
              '<div style="width:7mm;height:7mm;min-width:7mm;border-radius:50%;border:0.4mm solid ' + s.accent + ';display:flex;align-items:center;justify-content:center;margin-top:0.5mm;background:rgba(201,168,76,0.05);">' + CONFIG.icons.leaf + '</div>' +
              '<div style="display:flex;flex-direction:column;gap:0.5mm;padding-top:0.5mm;"><div style="line-height:1.5;color:' + s.muted + ';font-size:' + Math.round(s.taglineSize * 0.6) + 'px;">' + tagline + '</div></div>' +
            '</div>' +
          '</div>' +
          '<div style="width:30mm;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">' +
            '<div style="position:absolute;left:0;top:12%;bottom:18%;width:0.3mm;background:linear-gradient(180deg, transparent, ' + s.accent + ', transparent);opacity:0.35;"></div>' +
            '<div style="background:#fff;padding:2.5mm;border-radius:3.5mm;border:0.6mm solid ' + s.accent + ';box-shadow:0 1mm 4mm rgba(0,0,0,0.3);margin-bottom:2mm;">' +
              '<div class="qr-box" style="width:52px;height:52px;"><img src="' + (State.qrDataUrl || '') + '" width="52" height="52" style="display:block;width:52px;height:52px;" alt="QR"></div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:1.5mm;background:linear-gradient(135deg, ' + s.accent + ', ' + accentDark + ');color:#0a0a0a;padding:1.5mm 3mm;border-radius:6mm;font-size:' + Math.round(s.qrLabelSize * 0.6) + 'px;font-weight:600;letter-spacing:0.3px;box-shadow:0 0.5mm 2mm rgba(201,168,76,0.25);white-space:nowrap;">' + CONFIG.icons.mobile + '<span>Escanea para contactarnos</span></div>' +
          '</div>' +
        '</div>' +
        
      '</div>';
    }

    return '<div class="card card--back" id="card-back-bg" style="background:' + s.bgCss + ';">' +
      bgImageHtml +
      '<div class="card__bg"></div>' +
      decoHtml +
      '<div class="back-content">' +
        '<div class="back-left">' +
          '<div class="info-row">' +
            '<div class="info-row__icon" style="border-color:' + s.accent + ';">' + CONFIG.icons.user + '</div>' +
            '<div class="info-row__text">' +
              '<div class="info-row__value info-row__value--name" id="back-name" style="color:' + s.accent + ';font-size:' + s.nameSize + 'px;">' + name + '</div>' +
              '<div class="info-row__value info-row__value--title" id="back-title" style="font-size:' + s.titleSize + 'px;">' + title + '</div>' +
              '<div class="info-row__underline" style="background:linear-gradient(90deg, ' + s.accent + ', transparent);"></div>' +
            '</div>' +
          '</div>' +
          '<div class="info-row">' +
            '<div class="info-row__icon" style="border-color:' + s.accent + ';">' + CONFIG.icons.phone + '</div>' +
            '<div class="info-row__text"><div class="info-row__value" id="back-phone" style="color:' + s.text + ';font-size:' + s.phoneSize + 'px;">' + phone + '</div></div>' +
          '</div>' +
          '<div class="info-row">' +
            '<div class="info-row__icon" style="border-color:' + s.accent + ';">' + CONFIG.icons.email + '</div>' +
            '<div class="info-row__text"><div class="info-row__value" id="back-email" style="color:' + s.text + ';font-size:' + s.emailSize + 'px;">' + email + '</div></div>' +
          '</div>' +
          '<div class="info-row">' +
            '<div class="info-row__icon" style="border-color:' + s.accent + ';">' + CONFIG.icons.leaf + '</div>' +
            '<div class="info-row__text"><div class="info-row__value info-row__value--multi" id="back-tagline" style="color:' + s.muted + ';font-size:' + s.taglineSize + 'px;">' + tagline + '</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="back-right">' +
          '<div class="back-divider" style="background:linear-gradient(180deg, transparent, ' + s.accent + ', transparent);"></div>' +
          '<div class="qr-wrap" style="border-color:' + s.accent + ';"><div class="qr-box" id="qr-box"></div></div>' +
          '<div class="qr-label" style="background:linear-gradient(135deg, ' + s.accent + ', ' + accentDark + ');">' + CONFIG.icons.mobile + '<span>Escanea para contactarnos</span></div>' +
        '</div>' +
     
    '</div>';
  },

  renderSingleFace(s, isPrint) {
    const tagline = Utils.escapeHtml(s.tagline).replace(/\n/g, '<br>');
    const name = Utils.escapeHtml(s.name);
    const title = Utils.escapeHtml(s.title);
    const phone = Utils.escapeHtml(s.phone);
    const email = Utils.escapeHtml(s.email);
    const whatsapp = Utils.escapeHtml(s.whatsapp);
    const footerCenter = Utils.escapeHtml(s.footerCenter).replace(/\n/g, '<br>');
    const fontScript = CONFIG.googleFontMap[s.font] || "'Dancing Script', cursive";
    const accentLight = Utils.lightenColor(s.accent, 30);
    const accentDark = Utils.darkenColor(s.accent, 20);

    let logoHtml = '';
    if (!s.useLogoSvg && s.logoUrl) {
      logoHtml = '<div class="logo-img active" style="width:' + Math.round(s.logoSize * 0.75) + 'px;height:' + Math.round(s.logoSize * 0.92) + 'px;"><img src="' + Utils.escapeHtml(s.logoUrl) + '" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));display:block;" alt="Logo"></div>';
    } else {
      logoHtml = '<div class="logo-svg" style="width:' + Math.round(s.logoSize * 0.75) + 'px;height:' + Math.round(s.logoSize * 0.92) + 'px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.4));">' + this._getLogoSVG(s) + '</div>';
    }

    const decoHtml = this._getDecorationHtml('front', s);
    const bgImageHtml = this._getBgImageHtml(s);

    if (isPrint) {
      return '<div class="card card--single" style="background:' + s.bgCss + ';border-radius:3mm;position:relative;overflow:hidden;width:100%;height:100%;">' +
        bgImageHtml +
        '<div style="position:absolute;inset:0;background:' + s.bg + ';z-index:0;"></div>' +
        decoHtml +
        '<div style="position:relative;z-index:10;display:flex;height:100%;padding:5mm 6mm 12mm;gap:5mm;">' +
          '<div style="width:32%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3mm;border-right:0.5mm solid ' + s.accent + ';padding-right:4mm;">' +
            logoHtml +
            '<div style="text-align:center;">' +
              '<span style="font-family:\'Cormorant Garamond\',serif;font-size:18px;font-weight:700;letter-spacing:2.5mm;color:' + s.accent + ';text-transform:uppercase;line-height:1;">EWE</span>' +
              '<span style="font-family:\'Montserrat\',sans-serif;font-size:' + Math.round(s.essentiaSize * 0.55) + 'px;color:' + s.accent + ';line-height:0.9;display:block;">Esentia</span>' +
            '</div>' +
            '<p style="font-family:\'Montserrat\',sans-serif;font-size:' + Math.round(s.taglineSize * 0.65) + 'px;color:' + s.muted + ';line-height:1.5;letter-spacing:0.5mm;text-transform:uppercase;font-weight:300;text-align:center;">' + tagline + '</p>' +
          '</div>' +
          '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:3.5mm;padding-left:3mm;">' +
            '<div style="font-family:\'Cormorant Garamond\',serif;font-size:' + Math.round(s.nameSize * 0.75) + 'px;font-weight:700;color:' + s.accent + ';letter-spacing:0.5px;">' + name + '</div>' +
            '<div style="font-size:' + Math.round(s.titleSize * 0.75) + 'px;color:' + s.muted + ';letter-spacing:1.5mm;text-transform:uppercase;font-weight:500;">' + title + '</div>' +
            '<div style="width:100%;height:0.4mm;background:linear-gradient(90deg, ' + s.accent + ', transparent);opacity:0.4;margin:1.5mm 0;"></div>' +
            '<div style="display:flex;align-items:center;gap:2.5mm;font-size:' + Math.round(s.phoneSize * 0.7) + 'px;color:' + s.text + ';"><span style="color:' + s.accent + ';font-size:1.1em;">&#9742;</span> ' + phone + '</div>' +
            '<div style="display:flex;align-items:center;gap:2.5mm;font-size:' + Math.round(s.emailSize * 0.7) + 'px;color:' + s.text + ';"><span style="color:' + s.accent + ';font-size:1.1em;">&#9993;</span> ' + email + '</div>' +
            '<div style="display:flex;align-items:center;gap:2.5mm;font-size:' + Math.round(s.taglineSize * 0.65) + 'px;color:' + s.muted + ';"><span style="color:' + s.accent + ';font-size:1.1em;">&#127807;</span> ' + tagline + '</div>' +
          '</div>' +
          '<div style="width:28mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5mm;">' +
            '<div style="background:#fff;padding:3mm;border-radius:4mm;border:0.8mm solid ' + s.accent + ';box-shadow:0 1mm 3mm rgba(0,0,0,0.2);">' +
              '<div class="qr-box" style="width:55px;height:55px;"><img src="' + (State.qrDataUrl || '') + '" width="55" height="55" style="display:block;width:55px;height:55px;" alt="QR"></div>' +
            '</div>' +
            '<div style="font-size:8px;color:' + s.muted + ';text-align:center;line-height:1.4;font-weight:500;">Escanea para<br>contactarnos</div>' +
          '</div>' +
        '</div>' +
        
      '</div>';
    }

    return '<div class="card card--single" id="card-single-bg" style="background:' + s.bgCss + ';">' +
      bgImageHtml +
      '<div class="card__bg"></div>' +
      decoHtml +
      '<div style="position:relative;z-index:10;display:flex;height:100%;padding:24px 28px 48px;gap:20px;">' +
        '<div style="width:32%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border-right:1.5px solid ' + s.accent + ';padding-right:20px;">' +
          logoHtml +
          '<div style="text-align:center;">' +
            '<span style="font-family:\'Cormorant Garamond\',serif;font-size:28px;font-weight:700;letter-spacing:5px;color:' + s.accent + ';text-transform:uppercase;line-height:1;">EWE</span>' +
            '<span style="font-family:\'Montserrat\',sans-serif;font-size:' + Math.round(s.essentiaSize * 0.85) + 'px;color:' + s.accent + ';line-height:0.9;display:block;">Esentia</span>' +
          '</div>' +
          '<p style="font-family:\'Montserrat\',sans-serif;font-size:' + Math.round(s.taglineSize * 0.95) + 'px;color:' + s.muted + ';line-height:1.6;letter-spacing:1.5px;text-transform:uppercase;font-weight:300;text-align:center;">' + tagline + '</p>' +
        '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;padding-left:12px;">' +
          '<div style="font-family:\'Cormorant Garamond\',serif;font-size:' + Math.round(s.nameSize * 1.1) + 'px;font-weight:700;color:' + s.accent + ';letter-spacing:0.5px;">' + name + '</div>' +
          '<div style="font-size:' + Math.round(s.titleSize * 1.1) + 'px;color:' + s.muted + ';letter-spacing:3px;text-transform:uppercase;font-weight:500;">' + title + '</div>' +
          '<div style="width:100%;height:1.5px;background:linear-gradient(90deg, ' + s.accent + ', transparent);opacity:0.4;margin:6px 0;"></div>' +
          '<div style="display:flex;align-items:center;gap:10px;font-size:' + Math.round(s.phoneSize * 1.05) + 'px;color:' + s.text + ';"><span style="color:' + s.accent + ';font-size:1.2em;">&#9742;</span> ' + phone + '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;font-size:' + Math.round(s.emailSize * 1.05) + 'px;color:' + s.text + ';"><span style="color:' + s.accent + ';font-size:1.2em;">&#9993;</span> ' + email + '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;font-size:' + Math.round(s.taglineSize * 0.95) + 'px;color:' + s.muted + ';"><span style="color:' + s.accent + ';font-size:1.2em;">&#127807;</span> ' + tagline + '</div>' +
        '</div>' +
        '<div style="width:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">' +
          '<div style="background:#fff;padding:10px;border-radius:12px;border:2.5px solid ' + s.accent + ';box-shadow:0 3px 12px rgba(0,0,0,0.15);">' +
            '<div class="qr-box" style="width:90px;height:90px;"><img src="' + (State.qrDataUrl || '') + '" width="90" height="90" style="display:block;width:90px;height:90px;" alt="QR"></div>' +
          '</div>' +
          '<div style="font-size:11px;color:' + s.muted + ';text-align:center;line-height:1.4;font-weight:500;">Escanea para<br>contactarnos</div>' +
        '</div>' +
      '</div>' +
      
    '</div>';
  },_getLogoSVG(s) {
    const accentLight = Utils.lightenColor(s.accent, 30);
    return '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="fg-logo" x1="0%" y1="100%" x2="0%" y2="0%">' +
          '<stop offset="0%" stop-color="' + s.accent + '"/>' +
          '<stop offset="50%" stop-color="' + accentLight + '"/>' +
          '<stop offset="100%" stop-color="#fff5d6"/>' +
        '</linearGradient>' +
        '<linearGradient id="lg-logo" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="#1a4a1a"/><stop offset="100%" stop-color="#0d2e0d"/>' +
        '</linearGradient>' +
        '<filter id="gl-logo"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>' +
      '<path d="M60,75 C45,65 30,50 28,35 C26,20 35,12 45,15 C52,17 56,25 58,35" fill="url(#lg-logo)" stroke="' + s.accent + '" stroke-width="0.8"/>' +
      '<path d="M60,75 C75,65 90,50 92,35 C94,20 85,12 75,15 C68,17 64,25 62,35" fill="url(#lg-logo)" stroke="' + s.accent + '" stroke-width="0.8"/>' +
      '<path d="M60,75 C50,60 48,45 52,32 C55,22 60,18 60,18 C60,18 65,22 68,32 C72,45 70,60 60,75" fill="#143314" stroke="' + s.accent + '" stroke-width="0.6"/>' +
      '<path d="M60,75 Q55,55 52,40" stroke="' + s.accent + '" stroke-width="0.5" fill="none" opacity="0.5"/>' +
      '<path d="M60,75 Q65,55 68,40" stroke="' + s.accent + '" stroke-width="0.5" fill="none" opacity="0.5"/>' +
      '<path d="M60,75 L60,35" stroke="' + s.accent + '" stroke-width="0.4" fill="none" opacity="0.4"/>' +
      '<path d="M60,75 C52,60 50,45 54,30 C56,20 58,12 60,5 C62,12 64,20 66,30 C70,45 68,60 60,75" fill="url(#fg-logo)" filter="url(#gl-logo)"/>' +
      '<path d="M60,70 C55,58 54,48 56,38 C57,32 59,28 60,24 C61,28 63,32 64,38 C66,48 65,58 60,70" fill="' + s.bg + '"/>' +
      '<path d="M60,68 C57,58 57,50 58,42 C59,38 60,35 60,35 C60,35 61,38 62,42 C63,50 63,58 60,68" fill="' + s.text + '"/>' +
      '<path d="M60,5 Q58,-5 60,-15 Q62,-25 59,-35" stroke="#4a4a4a" stroke-width="1.2" fill="none" opacity="0.25" stroke-linecap="round"/>' +
    '</svg>';
  },

  _getDecorationHtml(side, s) {
    if (!s.showDecorations) return '';
    let html = '';
    if (s.showTexture) {
      html += '<div class="card__texture"></div>';
    }
    if (s.showVignette) {
      html += '<div class="card__vignette"></div>';
    }
    if (s.showShapes && side === 'front') {
      html += '<div class="shape shape--arc-tl"></div>' +
        '<div class="shape shape--arc-br"></div>' +
        '<div class="shape shape--dot-pattern"></div>';
    }
    if (s.showShapes && side === 'back') {
      html += '<div class="shape shape--dot-pattern-back"></div>';
    }
    if (s.showFoliage && side === 'front') {
      html += '<div class="foliage foliage--tl"><div class="foliage__fallback foliage__fallback--tl"></div></div>' +
        '<div class="foliage foliage--tr"><div class="foliage__fallback foliage__fallback--tr"></div></div>';
    }
    if (s.showFoliage && side === 'back') {
      html += '<div class="foliage foliage--back"><div class="foliage__fallback foliage__fallback--back"></div></div>';
    }
    if (side === 'front') {
      html += '<div class="deco-line deco-line--left"></div>';
    }
    return html;
  },

  _getBgImageHtml(s) {
    if (!s.bgImageUrl) return '';
    const bgSize = s.bgImagePosition === 'cover' ? 'cover' : 'contain';
    const bgPos = s.bgImagePosition === 'cover' ? 'center' : s.bgImagePosition;
    const opacity = s.bgImageOpacity / 100;
    return '<div class="card__bg-image" style="background-image:url(\'' + s.bgImageUrl + '\');background-size:' + bgSize + ';background-position:' + bgPos + ';background-repeat:no-repeat;opacity:' + opacity + ';"></div>';
  }
};

const PrintEngine = {
  calcInfo() {
    const pKey = document.getElementById('print-page').value;
    const cKey = document.getElementById('print-card').value;
    const qty = parseInt(document.getElementById('print-qty').value) || 100;
    const margin = parseInt(document.getElementById('print-margin').value) || 10;
    const gap = parseInt(document.getElementById('print-gap').value) || 3;
    const page = CONFIG.pageSizes[pKey];
    const card = CONFIG.cardSizes[cKey];
    const availableWidth = page.w - (margin * 2);
    const availableHeight = page.h - (margin * 2);
    const cols = Math.floor((availableWidth + gap) / (card.w + gap));
    const rows = Math.floor((availableHeight + gap) / (card.h + gap));
    const perSheet = cols * rows;
    const sheets = Math.ceil(qty / perSheet);
    return { cols, rows, perSheet, sheets, qty, page, card, margin, gap, pKey, cKey };
  },

  updateInfo() {
    const info = this.calcInfo();
    const el = document.getElementById('print-info');
    if (el) {
      el.innerHTML = '<strong>' + info.qty + '</strong> tarjetas &rarr; <strong>' + info.sheets + '</strong> hojas frente + <strong>' + info.sheets + '</strong> hojas reverso<br><small>' + info.cols + '&times;' + info.rows + ' = ' + info.perSheet + ' tarjetas/hoja | Hoja: ' + info.pKey + ' | Tarjeta: ' + info.cKey + '</small>';
    }
    return info;
  },

  generateQR(callback) {
    const text = State.get().qr.trim() || 'https://example.com';
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(div);
    try {
      new QRCode(div, { text: text, width: 200, height: 200, colorDark: '#1a1a1a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      setTimeout(() => {
        const canvas = div.querySelector('canvas');
        State.qrDataUrl = canvas ? canvas.toDataURL('image/png') : '';
        document.body.removeChild(div);
        callback(State.qrDataUrl);
      }, 500);
    } catch (e) {
      console.error('Error QR:', e);
      document.body.removeChild(div);
      callback('');
    }
  },

  generateSheets() {
    this.generateQR((qrData) => {
      if (!qrData) qrData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const info = this.calcInfo();
      const { cols, rows, perSheet, sheets, qty, page, card, margin, gap } = info;
      document.getElementById('previewCards').style.display = 'none';
      document.getElementById('printPreview').style.display = 'flex';
      document.querySelector('.editor').classList.add('no-print');
      document.getElementById('print-stats').innerHTML = qty + ' tarjetas &middot; ' + sheets + ' hojas &middot; ' + cols + '&times;' + rows + '/hoja';
      let html = '';
      let cardCount = 0;
      for (let s = 0; s < sheets; s++) {
        const count = Math.min(perSheet, qty - cardCount);
        if (count <= 0) break;
        html += '<div class="sheet sheet-front" data-side="front" data-page="' + (s + 1) + '" style="width:' + page.w + 'mm;height:' + page.h + 'mm;padding:' + margin + 'mm;background:white;position:relative;box-shadow:0 10px 40px rgba(0,0,0,0.5);display:grid;grid-template-columns:repeat(' + cols + ', ' + card.w + 'mm);grid-template-rows:repeat(' + rows + ', ' + card.h + 'mm);gap:' + gap + 'mm;justify-content:center;align-content:start;page-break-after:always;page-break-inside:avoid;"><span class="sheet-label">FRENTE &mdash; Hoja ' + (s + 1) + ' de ' + sheets + '</span>';
        for (let i = 0; i < count; i++) { html += CardRenderer.render('front', 'print'); cardCount++; }
        for (let i = count; i < perSheet; i++) { html += '<div style="width:' + card.w + 'mm;height:' + card.h + 'mm;"></div>'; }
        html += '</div>';
      }
      cardCount = 0;
      for (let s = 0; s < sheets; s++) {
        const count = Math.min(perSheet, qty - cardCount);
        if (count <= 0) break;
        html += '<div class="sheet sheet-back" data-side="back" data-page="' + (s + 1) + '" style="width:' + page.w + 'mm;height:' + page.h + 'mm;padding:' + margin + 'mm;background:white;position:relative;box-shadow:0 10px 40px rgba(0,0,0,0.5);display:grid;grid-template-columns:repeat(' + cols + ', ' + card.w + 'mm);grid-template-rows:repeat(' + rows + ', ' + card.h + 'mm);gap:' + gap + 'mm;justify-content:center;align-content:start;page-break-after:always;page-break-inside:avoid;"><span class="sheet-label">REVERSO &mdash; Hoja ' + (s + 1) + ' de ' + sheets + '</span>';
        for (let i = 0; i < count; i++) { html += CardRenderer.render('back', 'print'); cardCount++; }
        for (let i = count; i < perSheet; i++) { html += '<div style="width:' + card.w + 'mm;height:' + card.h + 'mm;"></div>'; }
        html += '</div>';
      }
      document.getElementById('sheetsContainer').innerHTML = html;
      document.getElementById('printPreview').scrollIntoView({ behavior: 'smooth' });
    });
  }
};

const PreviewController = {
  update() {
    State.loadFromDOM();
    const s = State.get();
    const root = document.documentElement;
    root.style.setProperty('--c-gold', s.accent);
    root.style.setProperty('--c-gold-light', Utils.lightenColor(s.accent, 30));
    root.style.setProperty('--c-gold-dark', Utils.darkenColor(s.accent, 20));
    root.style.setProperty('--c-bg', s.bg);
    root.style.setProperty('--c-footer', s.footer);
    root.style.setProperty('--c-text', s.text);
    root.style.setProperty('--c-muted', s.muted);
    root.style.setProperty('--font-script', CONFIG.googleFontMap[s.font] || "'Dancing Script', cursive");
    root.style.setProperty('--logo-size', s.logoSize + 'px');
    root.style.setProperty('--logo-h', Math.round(s.logoSize * 1.22) + 'px');
    root.style.setProperty('--essentia-size', s.essentiaSize + 'px');

    const preview = document.getElementById('previewCards');
    if (preview) {
      preview.innerHTML = '';
      const frontWrap = document.createElement('div');
      frontWrap.className = 'card-wrapper';
      frontWrap.innerHTML = '<div class="card-label">Frente</div>';
      const frontTemp = document.createElement('div');
      frontTemp.innerHTML = CardRenderer.render('front', 'preview');
      frontWrap.appendChild(frontTemp.firstElementChild);
      preview.appendChild(frontWrap);

      const backWrap = document.createElement('div');
      backWrap.className = 'card-wrapper';
      backWrap.innerHTML = '<div class="card-label">Reverso</div>';
      const backTemp = document.createElement('div');
      backTemp.innerHTML = CardRenderer.render('back', 'preview');
      backWrap.appendChild(backTemp.firstElementChild);
      preview.appendChild(backWrap);
    }
    this._generatePreviewQR();
  },

  _generatePreviewQR() {
    const s = State.get();
    const qrBox = document.getElementById('qr-box');
    if (!qrBox) return;
    qrBox.innerHTML = '';
    try {
      new QRCode(qrBox, { text: s.qr.trim() || 'https://example.com', width: 105, height: 105, colorDark: '#1a1a1a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      setTimeout(() => {
        const canvas = qrBox.querySelector('canvas');
        if (canvas) State.qrDataUrl = canvas.toDataURL('image/png');
      }, 500);
    } catch (e) { console.error('Error QR:', e); }
  }
};

const DownloadEngine = {
  async downloadCardImage(mode) {
    const spinner = document.getElementById('downloadSpinner');
    if (spinner) spinner.style.display = 'block';
    try {
      // Asegurar que las fuentes estén cargadas antes de capturar
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));

      if (mode === 'single') {
        await this._downloadSingleFace();
      } else if (mode === 'both') {
        await this._downloadBothFaces();
      } else if (mode === 'front') {
        await this._downloadOneFace('front');
      } else if (mode === 'back') {
        await this._downloadOneFace('back');
      }
    } catch (e) {
      console.error('Error descargando imagen:', e);
      alert('Error al generar la imagen. Intenta de nuevo. Detalle: ' + e.message);
    } finally {
      if (spinner) spinner.style.display = 'none';
      closeDownloadModal();
    }
  },

  _createCaptureContainer() {
    // Eliminar contenedor anterior si existe
    let container = document.getElementById('capture-container');
    if (container) container.remove();

    container = document.createElement('div');
    container.id = 'capture-container';
    // Técnica: overflow:hidden + height:0 permite que html2canvas renderice
    // el contenido correctamente mientras está oculto visualmente
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:0;overflow:hidden;z-index:-1;opacity:0;';
    document.body.appendChild(container);
    return container;
  },

  _removeCaptureContainer() {
    const container = document.getElementById('capture-container');
    if (container) {
      // Pequeño delay para asegurar que la descarga inició
      setTimeout(() => container.remove(), 2000);
    }
  },

  async _downloadOneFace(face) {
    const s = State.get();
    const container = this._createCaptureContainer();

    const html = face === 'front' 
      ? CardRenderer.render('front', 'print') 
      : CardRenderer.render('back', 'print');
    container.innerHTML = html;

    const cardEl = container.querySelector('.card');
    if (!cardEl) {
      this._removeCaptureContainer();
      throw new Error('No se encontró el elemento de tarjeta');
    }

    // Configurar dimensiones explícitas
    cardEl.style.width = '1050px';
    cardEl.style.height = '600px';
    cardEl.style.borderRadius = '0';
    cardEl.style.boxShadow = 'none';
    cardEl.style.position = 'relative';
    cardEl.style.opacity = '1';

    // Esperar a que todo se renderice
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Capturar usando el contenedor padre para asegurar contexto completo
    const canvas = await html2canvas(cardEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: s.bg,
      logging: false,
      width: 1050,
      height: 600,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1050,
      windowHeight: 600,
      removeContainer: false, // No limpiar el contenedor clonado automáticamente
      onclone: function(clonedDoc) {
        const clonedEl = clonedDoc.querySelector('.card');
        if (clonedEl) {
          clonedEl.style.transform = 'none';
          clonedEl.style.opacity = '1';
          clonedEl.style.visibility = 'visible';
        }
      }
    });

    const link = document.createElement('a');
    link.download = Utils.generateFileName(face);
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();

    this._removeCaptureContainer();
  },

  async _downloadBothFaces() {
    const s = State.get();
    const container = this._createCaptureContainer();

    const frontHtml = CardRenderer.render('front', 'print');
    const backHtml = CardRenderer.render('back', 'print');
    container.innerHTML = '<div id="capture-wrapper" style="display:flex;flex-direction:column;width:1050px;">' + frontHtml + backHtml + '</div>';

    const wrapper = container.querySelector('#capture-wrapper');
    wrapper.style.opacity = '1';

    const cards = wrapper.querySelectorAll('.card');
    cards.forEach(c => {
      c.style.width = '1050px';
      c.style.height = '600px';
      c.style.borderRadius = '0';
      c.style.boxShadow = 'none';
      c.style.marginBottom = '0';
      c.style.opacity = '1';
      c.style.position = 'relative';
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1050,
      height: 1200,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1050,
      windowHeight: 1200,
      removeContainer: false,
      onclone: function(clonedDoc) {
        clonedDoc.querySelectorAll('.card').forEach(c => {
          c.style.transform = 'none';
          c.style.opacity = '1';
          c.style.visibility = 'visible';
        });
      }
    });

    const link = document.createElement('a');
    link.download = Utils.generateFileName('ambas-caras');
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();

    this._removeCaptureContainer();
  },

  async _downloadSingleFace() {
    const s = State.get();
    const container = this._createCaptureContainer();

    const html = CardRenderer.renderSingleFace(s, true);
    container.innerHTML = html;

    const cardEl = container.querySelector('.card');
    if (!cardEl) {
      this._removeCaptureContainer();
      throw new Error('No se encontró el elemento de tarjeta');
    }

    cardEl.style.width = '1050px';
    cardEl.style.height = '600px';
    cardEl.style.borderRadius = '0';
    cardEl.style.boxShadow = 'none';
    cardEl.style.position = 'relative';
    cardEl.style.opacity = '1';

    await new Promise(resolve => setTimeout(resolve, 1500));

    const canvas = await html2canvas(cardEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: s.bg,
      logging: false,
      width: 1050,
      height: 600,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1050,
      windowHeight: 600,
      removeContainer: false,
      onclone: function(clonedDoc) {
        const clonedEl = clonedDoc.querySelector('.card');
        if (clonedEl) {
          clonedEl.style.transform = 'none';
          clonedEl.style.opacity = '1';
          clonedEl.style.visibility = 'visible';
        }
      }
    });

    const link = document.createElement('a');
    link.download = Utils.generateFileName('una-cara');
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();

    this._removeCaptureContainer();
  }
};
const EventHandler = {
  init() {
    const inputs = ['inp-name', 'inp-title', 'inp-phone', 'inp-whatsapp', 'inp-email',
      'inp-qr', 'inp-tagline', 'inp-footer-center', 'inp-accent', 'inp-bg', 'inp-footer',
      'inp-text', 'inp-muted', 'inp-bg-css', 'inp-font', 'inp-logo-url', 'inp-use-logo',
      'inp-logo-size', 'inp-essentia-size', 'inp-title-size', 'inp-name-size',
      'inp-tagline-size', 'inp-phone-size', 'inp-email-size', 'inp-footer-size',
      'inp-qr-label-size', 'inp-show-decorations', 'inp-show-foliage', 'inp-show-shapes',
      'inp-show-texture', 'inp-show-vignette', 'inp-bg-image-url', 'inp-bg-image-opacity',
      'inp-bg-image-position'];

    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const eventType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(eventType, () => {
          if (el.type === 'range') {
            const valId = id.replace('inp-', '').replace(/-([a-z])/g, (m, p1) => p1.toUpperCase()) + 'Val';
            const valEl = document.getElementById(valId);
            if (valEl) {
              let suffix = 'px';
              if (id.includes('opacity')) suffix = '%';
              valEl.textContent = el.value + suffix;
            }
          }
          PreviewController.update();
        });
      }
    });

    ['print-page', 'print-card', 'print-qty', 'print-margin', 'print-gap'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => PrintEngine.updateInfo());
        el.addEventListener('input', () => PrintEngine.updateInfo());
      }
    });
  }
};

window.quickDownload = function() {
  openDownloadModal();
};

window.switchSidebarTab = function(tabId, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar__tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');
};

window.handleBgImageUpload = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    State.bgImageDataUrl = e.target.result;
    document.getElementById('inp-bg-image-url').value = e.target.result;
    const previewWrap = document.getElementById('bgImagePreviewWrap');
    const previewImg = document.getElementById('bgImagePreview');
    if (previewWrap && previewImg) {
      previewImg.src = e.target.result;
      previewWrap.classList.add('active');
    }
    PreviewController.update();
  };
  reader.readAsDataURL(file);
};

window.generatePrintSheets = function() { PrintEngine.generateSheets(); };

window.backToEditor = function() {
  document.getElementById('printPreview').style.display = 'none';
  document.getElementById('previewCards').style.display = 'flex';
  document.querySelector('.editor').classList.remove('no-print');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.printFrontsOnly = function() {
  document.querySelectorAll('.sheet-front').forEach(s => s.style.display = 'grid');
  document.querySelectorAll('.sheet-back').forEach(s => s.style.display = 'none');
  window.print();
  setTimeout(() => document.querySelectorAll('.sheet').forEach(s => s.style.display = 'grid'), 1000);
};

window.printBacksOnly = function() {
  document.querySelectorAll('.sheet-front').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.sheet-back').forEach(s => s.style.display = 'grid');
  window.print();
  setTimeout(() => document.querySelectorAll('.sheet').forEach(s => s.style.display = 'grid'), 1000);
};

window.printAll = function() {
  document.querySelectorAll('.sheet').forEach(s => s.style.display = 'grid');
  window.print();
};

window.resetAll = function() {
  Object.keys(CONFIG.defaults).forEach(k => {
    const el = document.getElementById('inp-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
    if (el) {
      if (el.type === 'checkbox') el.checked = CONFIG.defaults[k];
      else el.value = CONFIG.defaults[k];
    }
  });
  const previewWrap = document.getElementById('bgImagePreviewWrap');
  if (previewWrap) previewWrap.classList.remove('active');
  State.bgImageDataUrl = '';
  PreviewController.update();
  PrintEngine.updateInfo();
};

window.exportHTML = function() {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('script').forEach(s => { if (!s.src || !s.src.includes('qrcode')) s.remove(); });
  const blob = new Blob(['<!DOCTYPE html>\n' + clone.outerHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ewe-essentia-tarjeta.html';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

window.openDownloadModal = function() {
  document.getElementById('downloadModal').classList.add('active');
};

window.closeDownloadModal = function() {
  document.getElementById('downloadModal').classList.remove('active');
};

window.downloadCardImage = function(mode) {
  DownloadEngine.downloadCardImage(mode);
};

document.addEventListener('click', function(e) {
  const modal = document.getElementById('downloadModal');
  if (modal && modal.classList.contains('active') && e.target === modal) {
    closeDownloadModal();
  }
});

function init() {
  State.init();
  EventHandler.init();
  PreviewController.update();
  PrintEngine.updateInfo();
  console.log('EWE Essentia v10 - Modular | Preview = Print | Download Ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}