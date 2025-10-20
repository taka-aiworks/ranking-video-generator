// Simple on-screen progress overlay for environments without console (e.g., iPad)
let overlayEl;
let listEl;

function ensureOverlay() {
  if (overlayEl) return;
  overlayEl = document.createElement('div');
  overlayEl.style.position = 'fixed';
  overlayEl.style.right = '12px';
  overlayEl.style.bottom = '12px';
  overlayEl.style.width = 'min(92vw, 420px)';
  overlayEl.style.maxHeight = '40vh';
  overlayEl.style.overflowY = 'auto';
  overlayEl.style.background = 'rgba(0,0,0,0.7)';
  overlayEl.style.color = '#fff';
  overlayEl.style.zIndex = '99999';
  overlayEl.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Helvetica Neue, Arial';
  overlayEl.style.fontSize = '12px';
  overlayEl.style.lineHeight = '1.4';
  overlayEl.style.padding = '10px 10px 8px';
  overlayEl.style.borderRadius = '8px';
  overlayEl.style.boxShadow = '0 6px 24px rgba(0,0,0,0.35)';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  const title = document.createElement('div');
  title.textContent = '進行ログ';
  title.style.fontWeight = '700';
  title.style.fontSize = '12px';
  const controls = document.createElement('div');
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'クリア';
  clearBtn.style.background = '#333';
  clearBtn.style.color = '#fff';
  clearBtn.style.border = '1px solid #555';
  clearBtn.style.borderRadius = '6px';
  clearBtn.style.padding = '2px 8px';
  clearBtn.style.cursor = 'pointer';
  clearBtn.onclick = () => { if (listEl) listEl.innerHTML = ''; };
  controls.appendChild(clearBtn);
  header.appendChild(title);
  header.appendChild(controls);

  listEl = document.createElement('div');
  listEl.style.marginTop = '6px';

  overlayEl.appendChild(header);
  overlayEl.appendChild(listEl);
  document.body.appendChild(overlayEl);
}

export function progressLog(message) {
  try {
    ensureOverlay();
    const row = document.createElement('div');
    const ts = new Date().toLocaleTimeString();
    row.textContent = `[${ts}] ${message}`;
    listEl.appendChild(row);
    listEl.scrollTop = listEl.scrollHeight;
  } catch (_) {
    // no-op
  }
}

export function progressClear() {
  try {
    ensureOverlay();
    listEl.innerHTML = '';
  } catch (_) {
    // no-op
  }
}

// expose to window for ad-hoc logging from console if needed
if (typeof window !== 'undefined') {
  window.__progressLog = progressLog;
  window.__progressClear = progressClear;
}


