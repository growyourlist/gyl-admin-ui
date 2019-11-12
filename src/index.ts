import './style.scss'
import { hsh } from './common/hsh'

const { byId, firstBySelector, onDOMReady } = hsh

onDOMReady(() => {
    const signInButton = byId('sign-in-button')
    signInButton.aEL('click', () => {
        const apiUrl = byId('gyl-api-url')
        const apiKey = byId('gyl-api-key')
        sessionStorage.setItem('gyl-api-url', apiUrl.value)
        sessionStorage.setItem('gyl-api-key', apiKey.value)
        const adminScreenMenu = firstBySelector('.admin-menu')
        signInButton.style.display = 'none'
        adminScreenMenu.style.display = null
    })
})
