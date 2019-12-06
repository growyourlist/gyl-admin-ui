import '../style.scss'
import { onDOMReady, bySelector } from './hsh/hsh'

onDOMReady(() => {
	const isLoggedIn = sessionStorage.getItem('gyl-api-url')
	if (isLoggedIn) {
		const menuItems = bySelector('.site-menu > li')
		menuItems.forEach(item => item.show())
	}
})
