import { Elm, onDOMReady, byId, firstBySelector, bySelector } from './common/hsh/hsh'
import { showSiteError } from './common/showSiteError'

onDOMReady(() => {
	const apiUrl = byId('gyl-api-url')
	const apiKey = byId('gyl-api-key')
	const signInButton = byId('sign-in-button')

	// If they are logging out, remove the key, hide the menu
	const isLoggingOut = /\blogout\b/.test(window.location.search || '')
	if (isLoggingOut) {
		sessionStorage.removeItem('gyl-api-key')
		const menuItems = bySelector('.site-menu > li:not(.public)')
		menuItems.forEach(item => item.hide())
		const adminScreenMenu = firstBySelector('.admin-menu')
		adminScreenMenu.hide()
	}

	const isRefreshingSession = /\brefresh-session\b/.test(window.location.search || '')
	const isLoggedIn = sessionStorage.getItem('gyl-api-key')
	if (!isRefreshingSession && isLoggedIn) {
		const apiConnectionContainer = firstBySelector('.api-connection-container')
		apiConnectionContainer.hide()
		const adminScreenMenu = firstBySelector('.admin-menu')
		adminScreenMenu.show()
	}
	
	const currentApiUrl = localStorage.getItem('gyl-api-url')
	if (currentApiUrl) {
		apiUrl.value = currentApiUrl
	}

	const doLogIn = () => {
		if (!apiUrl.value || !apiKey.value) {
			return showSiteError(new Elm(
				'p', 'Please enter both the API URL and API key.'
			))
		}
		const apiUrlString = (apiUrl.value.slice(-1) === '/') ?
			apiUrl.value.substring(0, apiUrl.value.length - 1) :
			apiUrl.value
		localStorage.setItem('gyl-api-url', apiUrlString)
		sessionStorage.setItem('gyl-api-key', apiKey.value)
		const apiConnectionContainer = firstBySelector('.api-connection-container')
		apiConnectionContainer.style.display = 'none'
		const adminScreenMenu = firstBySelector('.admin-menu')
		adminScreenMenu.style.display = null
		const menuItems = bySelector('.site-menu > li')
		menuItems.forEach(item => item.show())
	}

	apiKey.on('keypress', (event) => {
		if (event.key === 'Enter') {
			doLogIn()
		}
	})

	signInButton.on('click', doLogIn)
})
