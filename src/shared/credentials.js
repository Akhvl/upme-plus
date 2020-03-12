/* eslint-disable prefer-promise-reject-errors */
export const saveCredentials = (username, password) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ credentials: { username, password } }, () => {
      resolve({ username, password })
    })

    setTimeout(() => reject('storage error'), 5000)
  })
}

export const getCredentials = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['credentials'], result => {
      resolve(result.credentials)
    })

    setTimeout(() => reject('storage error'), 5000)
  })
}

export const clearCredentials = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ credentials: null }, result => {
      resolve(result)
    })

    setTimeout(() => reject('storage error'), 5000)
  })
}

window.saveCredentials = saveCredentials
window.getCredentials = getCredentials
window.clearCredentials = clearCredentials
