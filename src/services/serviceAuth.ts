import { REFRESH_TOKEN, ACCES_TOKEN } from '../constants'
import Keycloak from 'keycloak-js'

const _kc = new Keycloak('/keycloak.json')

const useKeycloak: () => [boolean, Keycloak] = () => {
  const authenticated = _kc.authenticated ?? false
  const keycloak = _kc
  return [authenticated, keycloak]
}

const _updateTokens = () => {
  const accessToken = _kc.token
  const refreshToken = _kc.refreshToken
  if (!accessToken || !refreshToken) return
  localStorage.setItem(ACCES_TOKEN, accessToken)
  localStorage.setItem(REFRESH_TOKEN, refreshToken)
}

const _clearTokens = () => {
  localStorage.removeItem(ACCES_TOKEN)
  localStorage.removeItem(REFRESH_TOKEN)
}

const initKeycloak: () => Promise<void> = () => {
  _kc.onAuthSuccess = _updateTokens
  _kc.onAuthRefreshSuccess = _updateTokens
  _kc.onAuthLogout = _clearTokens
  _kc.onAuthRefreshError = _clearTokens
  _kc.onAuthError = _clearTokens
  return _kc.init({ onLoad: 'check-sso' }).then((connected) => {
    if (connected) {
      console.log('Login Successful')
      return _kc.loadUserInfo().then(() => {
        console.log('User Info Collected Succesfully')
      })
    }
  })
}

export { initKeycloak, useKeycloak }
