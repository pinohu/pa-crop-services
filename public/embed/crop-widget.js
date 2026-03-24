/**
 * PA CROP Services — Embeddable Lead Capture Widget
 * GAP-05: Partner website embed
 * 
 * Usage: <script src="https://pacropservices.com/embed/crop-widget.js" data-partner="PARTNER_ID"></script>
 */
(function() {
  'use strict';

  var CROP_BASE = 'https://pacropservices.com';
  var script = document.currentScript || document.querySelector('script[src*="crop-widget.js"]');
  var PARTNER_ID = (script && script.getAttribute('data-partner')) || '';
  var BUTTON_TEXT = (script && script.getAttribute('data-text')) || 'Check PA Compliance';
  var BUTTON_COLOR = (script && script.getAttribute('data-color')) || '#534AB7';

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '.crop-widget-btn{display:inline-block;padding:12px 24px;background:' + BUTTON_COLOR + ';color:#fff;border:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .2s}',
    '.crop-widget-btn:hover{opacity:.9;transform:translateY(-1px)}',
    '.crop-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center}',
    '.crop-modal{background:#fff;border-radius:16px;padding:40px;width:480px;max-width:95vw;position:relative;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '.crop-modal h3{font-size:22px;font-weight:700;color:#0f1e3d;margin-bottom:8px}',
    '.crop-modal p{font-size:14px;color:#5a6a84;margin-bottom:24px}',
    '.crop-field{margin-bottom:16px}',
    '.crop-field label{display:block;font-size:12px;font-weight:600;color:#5a6a84;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}',
    '.crop-field input,.crop-field select{width:100%;padding:11px 14px;border:1.5px solid #d4cfc0;border-radius:8px;font-size:15px;font-family:inherit;outline:none;box-sizing:border-box}',
    '.crop-field input:focus,.crop-field select:focus{border-color:#534AB7;box-shadow:0 0 0 3px rgba(83,74,183,.1)}',
    '.crop-submit{width:100%;padding:14px;background:#0f1e3d;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}',
    '.crop-submit:hover{background:#1e3a6e}',
    '.crop-close{position:absolute;top:16px;right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:#5a6a84;line-height:1}',
    '.crop-seal{width:40px;height:40px;background:#0f1e3d;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px}',
    '.crop-success{text-align:center;padding:20px 0}',
    '.crop-success .check{width:60px;height:60px;background:#ecfdf5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px}',
  ].join('');
  document.head.appendChild(style);

  function createModal() {
    var overlay = document.createElement('div');
    overlay.className = 'crop-overlay';
    overlay.innerHTML = [
      '<div class="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-modal-title">',
      '  <button class="crop-close" onclick="closeCropWidget()" aria-label="Close">&times;</button>',
      '  <div class="crop-seal"><svg width="20" height="20" viewBox="0 0 24 24" fill="#c9a227"><path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5L12 1z"/></svg></div>',
      '  <h3 id="crop-modal-title">Check Your PA Compliance</h3>',
      '  <p>Find out if your Pennsylvania business is at risk. Free, 60-second assessment.</p>',
      '  <div id="crop-form-wrap">',
      '    <div class="crop-field"><label>Email Address</label><input type="email" id="crop-email" placeholder="you@yourbusiness.com" required></div>',
      '    <div class="crop-field"><label>Entity Type</label><select id="crop-type"><option value="">Select entity type...</option><option value="llc">LLC</option><option value="corp">Corporation</option><option value="lp">Limited Partnership</option><option value="foreign">Foreign Entity (out-of-state)</option><option value="other">Other</option></select></div>',
      '    <div class="crop-field"><label>First Name (optional)</label><input type="text" id="crop-first" placeholder="Your first name"></div>',
      '    <button class="crop-submit" onclick="submitCropWidget()">Check My Compliance →</button>',
      '    <p style="font-size:11px;color:#9ca3af;margin-top:12px;text-align:center">Powered by <a href="https://pacropservices.com" target="_blank" rel="noopener noreferrer" style="color:#534AB7">PA CROP Services</a> · Erie, PA · Licensed PA CROP Provider</p>',
      '  </div>',
      '  <div id="crop-success-wrap" style="display:none" class="crop-success">',
      '    <div class="check">✓</div>',
      '    <h3 style="color:#0f1e3d">You\'re on the list!</h3>',
      '    <p style="color:#5a6a84">Check your email for your PA compliance assessment. We\'ll be in touch within 1 business day.</p>',
      '    <a href="https://pacropservices.com" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0f1e3d;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">View PA CROP Plans →</a>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeCropWidget(); });
    setTimeout(function(){ document.getElementById('crop-email').focus(); }, 100);
    return overlay;
  }

  window.openCropWidget = function() {
    if (document.getElementById('crop-modal-title')) return;
    createModal();
  };

  window.closeCropWidget = function() {
    var overlay = document.querySelector('.crop-overlay');
    if (overlay) overlay.remove();
  };

  window.submitCropWidget = async function() {
    var email = document.getElementById('crop-email').value.trim();
    var entityType = document.getElementById('crop-type').value;
    var firstName = document.getElementById('crop-first').value.trim();
    if (!email) { document.getElementById('crop-email').focus(); return; }

    var btn = document.querySelector('.crop-submit');
    btn.textContent = 'Checking...'; btn.disabled = true;

    try {
      await fetch(CROP_BASE + '/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, firstName, entityType,
          source: 'partner-widget',
          hasForeignEntity: entityType === 'foreign',
          partnerId: PARTNER_ID,
          completedCheck: true
        })
      });
      document.getElementById('crop-form-wrap').style.display = 'none';
      document.getElementById('crop-success-wrap').style.display = 'block';
    } catch(e) {
      btn.textContent = 'Check My Compliance →'; btn.disabled = false;
    }
  };

  // Auto-inject button if data-auto attribute is present
  if (script && script.getAttribute('data-auto') !== 'false') {
    document.addEventListener('DOMContentLoaded', function() {
      var container = script.getAttribute('data-container');
      var target = container ? document.querySelector(container) : null;
      if (target || !container) {
        var btn = document.createElement('button');
        btn.className = 'crop-widget-btn';
        btn.textContent = BUTTON_TEXT;
        btn.onclick = window.openCropWidget;
        (target || document.body).appendChild(btn);
      }
    });
  }
})();
