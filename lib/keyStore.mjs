// The visitor's Gemini API key normally lives only in React state (memory) and is gone on reload.
// Only if they tick "Remember for this tab" is it copied to sessionStorage, which the browser
// clears when the tab is closed. The key is never written to localStorage, cookies or the URL.
const SESSION_KEY = 'pdf2quiz.geminiApiKey'

export function readRememberedKey() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) || ''
  } catch {
    return ''
  }
}

export function rememberKey(key) {
  try {
    if (key) window.sessionStorage.setItem(SESSION_KEY, key)
    else window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage blocked (private mode, policy): the key simply stays in memory.
  }
}

export function forgetKey() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // nothing stored
  }
}
