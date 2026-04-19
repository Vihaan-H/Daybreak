import type { Context, Config } from '@netlify/edge-functions'

const COOKIE_NAME = 'inspiration_session'
const COOKIE_MAX_AGE = 86400 // 24 hours

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  if (aBytes.length !== bBytes.length) {
    // Hash both to avoid timing leak on length
    await crypto.subtle.digest('SHA-256', aBytes)
    await crypto.subtle.digest('SHA-256', bBytes)
    return false
  }
  const aKey = await crypto.subtle.importKey('raw', aBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bKey = await crypto.subtle.importKey('raw', bBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const aSign = await crypto.subtle.sign('HMAC', aKey, encoder.encode('compare'))
  const bSign = await crypto.subtle.sign('HMAC', bKey, encoder.encode('compare'))
  const aArr = new Uint8Array(aSign)
  const bArr = new Uint8Array(bSign)
  let result = 0
  for (let i = 0; i < aArr.length; i++) {
    result |= aArr[i] ^ bArr[i]
  }
  return result === 0
}

function renderPage(content: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inspiration</title>
<style>
  :root {
    --bg: #0f0f0f;
    --bg-card: #1a1a1a;
    --bg-input: #2a2a2a;
    --border: #333;
    --text: #e8e8e8;
    --text-dim: #888;
    --accent: #c8a45e;
    --accent-hover: #dbb86e;
    --red: #f44336;
    --radius: 10px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px;
    max-width: 420px;
    width: 90%;
    text-align: center;
  }
  .card h1 {
    font-size: 22px;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 8px;
  }
  .card p {
    font-size: 14px;
    color: var(--text-dim);
    margin-bottom: 24px;
    line-height: 1.5;
  }
  .form-group {
    margin-bottom: 16px;
    text-align: left;
  }
  .form-group label {
    display: block;
    font-size: 13px;
    color: var(--text-dim);
    margin-bottom: 6px;
  }
  .form-group input {
    width: 100%;
    padding: 10px 14px;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
  }
  .form-group input:focus {
    border-color: var(--accent);
  }
  .btn {
    width: 100%;
    padding: 12px 20px;
    background: var(--accent);
    color: #000;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn:hover { background: var(--accent-hover); }
  .error {
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: var(--red);
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 16px;
  }
  .config-error {
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.3);
    color: #ffc107;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
  }
  .icon { font-size: 40px; margin-bottom: 16px; opacity: 0.7; }
</style>
</head>
<body>
${content}
</body>
</html>`
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function renderPasswordForm(error?: string): Response {
  const errorHtml = error ? `<div class="error">${error}</div>` : ''
  return renderPage(`
<div class="card">
  <div class="icon">&#9788;</div>
  <h1>Inspiration</h1>
  <p>This page is password protected. Enter the password to continue.</p>
  ${errorHtml}
  <form method="POST" action="/">
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autofocus placeholder="Enter password">
    </div>
    <button type="submit" class="btn">Unlock</button>
  </form>
</div>`)
}

function renderNotConfigured(): Response {
  return renderPage(`
<div class="card">
  <div class="icon">&#9888;</div>
  <h1>Inspiration</h1>
  <div class="config-error">
    This page is not yet configured. The site owner needs to set the <strong>PROTECTED_PAGE_PASSWORD</strong> environment variable.
  </div>
</div>`)
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url)

  // Handle logout
  if (url.pathname === '/logout') {
    context.cookies.delete({ name: COOKIE_NAME, path: '/' })
    return new Response(null, {
      status: 302,
      headers: { Location: '/' },
    })
  }

  const configuredPassword = Netlify.env.get('PROTECTED_PAGE_PASSWORD')

  // If env var not set, block access entirely
  if (!configuredPassword) {
    return renderNotConfigured()
  }

  // Check session cookie
  const sessionCookie = context.cookies.get(COOKIE_NAME)
  if (sessionCookie) {
    const expectedHash = await hashPassword(configuredPassword)
    const isValid = await timingSafeCompare(sessionCookie, expectedHash)
    if (isValid) {
      // Valid session — pass through to origin
      return
    }
  }

  // Handle POST (password submission)
  if (req.method === 'POST') {
    const formData = await req.formData()
    const submittedPassword = formData.get('password')?.toString() || ''
    const submittedHash = await hashPassword(submittedPassword)
    const expectedHash = await hashPassword(configuredPassword)
    const isCorrect = await timingSafeCompare(submittedHash, expectedHash)

    if (isCorrect) {
      context.cookies.set({
        name: COOKIE_NAME,
        value: expectedHash,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
        expires: new Date(Date.now() + COOKIE_MAX_AGE * 1000),
      })
      return new Response(null, {
        status: 302,
        headers: { Location: '/' },
      })
    }

    return renderPasswordForm('Incorrect password. Please try again.')
  }

  // Show password form for GET requests
  return renderPasswordForm()
}

export const config: Config = {
  path: ['/', '/logout'],
}
