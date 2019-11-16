import './style.scss'
import { Elm, onDOMReady, byId, firstBySelector } from './common/hsh'
import { showSiteError } from './common/showSiteError'

onDOMReady(() => {
    if (sessionStorage.getItem('gyl-api-url')) {
        const apiConnectionContainer = firstBySelector('.api-connection-container')
        apiConnectionContainer.style.display = 'none'
        const adminScreenMenu = firstBySelector('.admin-menu')
        adminScreenMenu.style.display = null
    }
    const signInButton = byId('sign-in-button')
    signInButton.on('click', () => {
        const apiUrl = byId('gyl-api-url')
        const apiKey = byId('gyl-api-key')
        if (!apiUrl.value || !apiKey.value) {
            return showSiteError(new Elm(
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
