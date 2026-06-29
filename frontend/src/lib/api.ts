// 認証トークンを保持するモジュール変数
let _token = ''

export function setAuthToken(token: string) {
  _token = token
}

export function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...options?.headers,
    },
  })
}
