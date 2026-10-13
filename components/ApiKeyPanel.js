import { useState } from 'react'

export default function ApiKeyPanel({ apiKey, onKeyChange, remember, onRememberChange }) {
  const [show, setShow] = useState(false)

  return (
    <fieldset className="space-y-3 rounded-xl border border-indigo-200 p-4 dark:border-indigo-800">
      <legend className="px-1 font-semibold">Your Gemini API key</legend>

      <div className="flex gap-2">
        <label htmlFor="api-key" className="sr-only">
          Gemini API key
        </label>
        <input
          id="api-key"
          name="gemini-api-key"
          type={show ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => onKeyChange(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Paste your Gemini API key"
          aria-describedby="key-notice"
          className="field min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          className="pill bg-gray-200 px-3 dark:bg-gray-700"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => onRememberChange(e.target.checked)}
          className="mt-1"
        />
        <span>
          <strong>Remember for this tab.</strong> Keeps the key in this tab&apos;s sessionStorage until you close the tab.
          Leave it unticked to keep the key in memory only (it is gone when you reload).
        </span>
      </label>

      <div id="key-notice" data-testid="key-notice" className="rounded-lg bg-indigo-50 p-3 text-sm text-gray-800 dark:bg-indigo-950 dark:text-gray-200">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your key stays in this browser. It is sent only to Google&apos;s Gemini API, never to this site or anyone else.</li>
          <li>Your PDF is read in your browser. Only its text is sent to Google, with your key.</li>
          <li>Calls are billed to your own Google account, or use its free quota.</li>
          <li>
            On the free tier Google may use what you send to improve its products, so don&apos;t upload personal or confidential
            material. See the{' '}
            <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">
              Gemini API terms
            </a>
            .
          </li>
        </ul>
        <p className="mt-2">
          No key yet?{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
            Create one in Google AI Studio
          </a>
          .
        </p>
      </div>
    </fieldset>
  )
}
