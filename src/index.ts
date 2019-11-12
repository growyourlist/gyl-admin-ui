import './style.scss'
import { hsh } from './common/hsh'
import { showSiteError } from './common/showSiteError'

const { byId, firstBySelector, onDOMReady, newElm } = hsh

onDOMReady(() => {
    const signInButton = byId('sign-in-button')
    signInButton.aEL('click', () => {
        const apiUrl = byId('gyl-api-url')
        const apiKey = byId('gyl-api-key')
        if (!apiUrl.value || !apiKey.value) {
            return showSiteError(newElm(
                'p', 'Please enter both the API URL and API key.'
            ))
        }
        const apiUrlString = (apiUrl.value.slice(-1) === '/') ?
            apiUrl.value.substring(0, apiUrl.value.length - 1) :
            apiUrl.value
        sessionStorage.setItem('gyl-api-url', apiUrlString)
        sessionStorage.setItem('gyl-api-key', apiKey.value)
        const apiConnectionContainer = firstBySelector('.api-connection-container')
        apiConnectionContainer.style.display = 'none'
        const adminScreenMenu = firstBySelector('.admin-menu')
        adminScreenMenu.style.display = null
    })
})
