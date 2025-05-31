import { setGlobalDispatcher, Agent } from 'undici';

setGlobalDispatcher(new Agent({ connect: { timeout: 30000 } }));

const UA = `@qixils.dev/${Date.now()}`
let lastRequest = 0
export const twitchLimit = 75
export const iaLimit = 285
export const webIaLimit = 170

// Networking functions

export const ratelimit = async (limit: number) => {
  if (limit <= 0) return;

  const waitUntil = lastRequest + limit
  const waitFor = waitUntil - Date.now()
  lastRequest = Math.max(Date.now(), lastRequest) + limit
  if (waitFor <= 0) return
  await new Promise((resolve) => setTimeout(resolve, waitFor))
}

export const fetchResponse = async (uri: string | URL | Request, init?: RequestInit, attempt?: number): Promise<Response | undefined> => {
  if (!attempt) attempt = 0

  if (!init) init = { headers: { 'User-Agent': UA } };

  const uriString = String(uri)
  await ratelimit(
    uriString.includes('/archive.org')
      ? iaLimit
      : uriString.includes('archive.org')
        ? webIaLimit
        : uriString.includes('api.twitch.tv')
          ? twitchLimit
          : 0
  )
  // console.log('Fetching', uriString)

  try {
    const response = await fetch(uri, init)
    if (!response.ok) {
      const text = await response.text()
      console.error("Failed to", init.method || 'GET', uriString, "failed", response.status, text.replace(/\s+/g, ' ').trim().substring(0, 200))
      if (response.status !== 404 && attempt < 15 && !text.includes("Invalid pagination")) {
        const sleepFor = response.status === 429 && response.headers.has('Ratelimit-Reset')
          ? Math.max(500, Date.now() - (parseInt(response.headers.get('Ratelimit-Reset') || '0') * 1000))
          : text.match(/rate ?limit|too many requests/ig)
            ? 90_000
            : 10_000
        await ratelimit(sleepFor) // TODO: a little janky hack fix to try to avoid spamming archive.org
        return await fetchResponse(uri, init, attempt + 1)
      }
      return
    }

    return response
  } catch (e: any) {
    console.error("Failed to fetch for unknown reason", 'cause' in e && String(e.cause).includes('TIMEDOUT') ? 'TIMEDOUT' : e)
    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      return await fetchResponse(uri, init, attempt + 1)
    }
  }
}

export const fetchText = async (uri: string | URL | Request, init?: RequestInit, attempt?: number): Promise<string | undefined> => {
  const response = await fetchResponse(uri, init, attempt)
  if (!response) return

  const text = await response.text()
  if (!text) {
    console.error("Failed? to GET", String(uri), "empty text", text)
    return text
  }

  return text
}

export const fetchJson = async (uri: string | URL | Request, init?: RequestInit, attempt?: number): Promise<any> => {
  const response = await fetchResponse(uri, init, attempt)
  if (!response) return

  const json = await response.json()
  if (!json) {
    console.error("Failed? to GET", String(uri), "empty object", json)
    return
  }

  return json
}

export const fetchJsonWithUrl = async (uri: string | URL | Request, init?: RequestInit, attempt?: number): Promise<{ url: string, json: any } | undefined> => {
  const response = await fetchResponse(uri, init, attempt)
  if (!response) return

  const json = await response.json()
  if (!json) {
    console.error("Failed? to GET", String(uri), "empty object", json)
    return
  }

  return { url: response.url, json }
}
