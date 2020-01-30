import { validateElement } from "../common/validateElement"
import {
	onDOMReady,
	firstBySelector,
	Elm,
	HSHElement,
	bySelector
} from "../common/hsh/hsh"
import { apiRequest } from "../common/apiRequest"

const validateSubscriberEmail = (inputElm: HTMLInputElement): void => {
	validateElement(inputElm, {
		email: {
			message: 'Subscriber Email must be a valid email address.'
		}
	})
}

const getQueueItemTypeIcon = (itemType: string): string => {
	switch (itemType) {
		case 'make choice based on tag': return '❓'
		case 'send email': return '📧'
		case 'unsubscribe': return '🔚'
		case 'wait': return '⏱'
		default: return '⬛'
	}
}

const getQueueItemElm = (queueItem: any): Elm => {
	let output = getQueueItemTypeIcon(queueItem.type) + ' '
	if (typeof queueItem.templateId === 'string') {
		output += `Send email: ${queueItem.templateId} `
	}
	if (typeof queueItem.autoresponderId === 'string') {
		output += `Autoresponder step: ${queueItem.autoresponderId} ➡ ${
			queueItem.autoresponderStep || '<no step defined>'
			}`
	}
	return new Elm('strong', output)
}

const generateIndent = (size: number): string => {
	return (new Array(size)).fill(' ').join('')
}

const prettyJSON = (jsonString: string): string => {
	let output = ''
	let inString = false
	let indentSize = 0
	let isEscape = false
	for (let i = 0; i < jsonString.length; i++) {
		const char = jsonString[i];
		if (!inString) {
			if (char === '{' || char === '[') {
				indentSize += 2
				output += `${char}\n${generateIndent(indentSize)}`
				continue
			}
			if (char === ',') {
				output += `${char}\n${generateIndent(indentSize)}`
				continue
			}
			if (char === ':' && (jsonString[i + 1] !== ' ')) {
				output += `${char} `
				continue
			}
			if (char === '}' || char === ']') {
				indentSize -= 2
				output += `\n${generateIndent(indentSize)}${char}`
				continue
			}
		}
		if (inString && char === '\\') {
			isEscape = !isEscape
		}
		if (char === '"' && !isEscape) {
			inString = !inString
		}
		if (inString && isEscape && (char !== '\\')) {
			isEscape = false
		}
		output += char
	}
	return output
}

const addToggleCollapseListeners = () => {
	const buttons = bySelector('.toggle-collapse')
	buttons.forEach(button => {
		button.on('click', () => {
			const container = button.parentUntil(
				elm => elm.classes.contains('tool-container')
			)
			if (!container) {
				return
			}
			const tool = container.query('.tool')
			if (!tool) {
				return
			}
			if (tool.classes.contains('collapsed')) {
				tool.classes.remove('collapsed')
				button.text = '➖ Collapse'
			}
			else {
				tool.classes.add('collapsed')
				button.text = '➕ Expand'
			}
		})
	})
}

onDOMReady(() => {
	const subscriberEmailInput = firstBySelector('.subscriber-email')
	subscriberEmailInput.on('change', function () {
		validateSubscriberEmail(<HTMLInputElement>subscriberEmailInput.element)
	})
	subscriberEmailInput.on('keyup', function () {
		validateSubscriberEmail(<HTMLInputElement>subscriberEmailInput.element)
	})
	const subscriberInfoEmailInput = firstBySelector('.subscriber-info-email')
	subscriberInfoEmailInput.on('change', function () {
		validateSubscriberEmail(<HTMLInputElement>subscriberInfoEmailInput.element)
	})
	subscriberInfoEmailInput.on('keyup', function () {
		validateSubscriberEmail(<HTMLInputElement>subscriberInfoEmailInput.element)
	});
	addToggleCollapseListeners()

	const getSubscriberButton = firstBySelector('.get-subscriber-info-button')
	const handleGetSubscriberInfoButtonClick = async () => {
		try {
			const email = subscriberInfoEmailInput.value
			getSubscriberButton.disable()
			const subscriberResponse = await apiRequest(
				`/subscriber?email=${email}`
			)
			const subscriber = await subscriberResponse.json()
			const subscriberInfoContainer = firstBySelector('.subscriber-info-container')
			subscriberInfoContainer.clear()
			subscriberInfoContainer.append(
				[
					new Elm(
						{ type: 'div', attrs: { 'class': 'subscriber-info' } },
						[
							new Elm('p', `Email: ${subscriber.email}`),
							new Elm('p', `Joined: ${subscriber.joined && (new Date(
								subscriber.joined
							)).toISOString()}`),
							new Elm('p', `Last Open/Click: ${
								subscriber.lastOpenOrClick && (new Date(
									subscriber.lastOpenOrClick
								)).toISOString()
							}`),
							new Elm('p', `Tags: ${subscriber.tags && subscriber.tags.join(', ')}`)
						]
					),
					new Elm(
						{
							type: 'pre',
						},
						prettyJSON(JSON.stringify(subscriber))
					),
				]
			)
			getSubscriberButton.enable()
		}
		catch (err) {
			console.error(err)
		}
	}
	getSubscriberButton.on('click', handleGetSubscriberInfoButtonClick)

	const getItemsButton = firstBySelector('.get-subscriber-queue-items-button')
	const handleGetItemsButtonClick = async () => {
		getItemsButton.disable()
		try {
			const email = subscriberEmailInput.value
			const itemsResponse = await apiRequest(
				`/subscriber/queue?email=${email}`
			)
			const items = await itemsResponse.json()
			const container = firstBySelector('.subscriber-queue-items-container')
			items.sort((a: any, b: any) => b.runAt - a.runAt)
			container.prepend([
				new Elm('h3', `Queue items for ${email}`),
				new Elm(
					{
						type: 'ol',
						attrs: {
							'class': 'queue-items list bordered vertical no-style',
						}
					},
					items.map((item: any) => {
						const timestamp = new Date(item.runAt)
						return new Elm('li', [
							new Elm(
								{
									type: 'div',
									attrs: {
										'class': 'queue-item'
									},
								},
								[
									new Elm('div', `${timestamp.toISOString().replace(/T/, ' ').replace(/\.\d+Z$/, ' UTC')}`),
									new Elm(
										{
											type: 'div',
											attrs: {
												'class': `ta-right ${item.completed ? 'completed' : 'queued'}`
											},
										},
										[
											`${item.completed ? 'Completed' : 'Queued'} `,
											new Elm('span', '●'),
										]
									),
									getQueueItemElm(item),
									new Elm(
										{
											type: 'button',
											attrs: {
												'class': 'button plain'
											},
											events: {
												'click': function () {
													const button = new HSHElement(this)
													const state = button.element.getAttribute('data-state')
													const details = button.parent.query('.queue-item-details')
													if (state === null) {
														details.append(new Elm(
															{
																type: 'pre',
															},
															prettyJSON(JSON.stringify(item))
														))
														details.show()
														button.text = '❌ Close Details'
														button.element.setAttribute('data-state', 'expanded')
													}
													else if (state === 'expanded') {
														details.hide()
														button.text = '🔍 Show Details'
														button.element.setAttribute('data-state', 'collapsed')
													}
													else if (state === 'collapsed') {
														details.show()
														button.text = '❌ Close Details'
														button.element.setAttribute('data-state', 'expanded')
													}
												}
											}
										},
										'🔍 Show Details'
									),
									new Elm(
										{
											type: 'div',
											attrs: {
												'class': 'queue-item-details grid-item-all-columns',
												'style': 'display:none',
											}
										}
									)
								],
							),
						])
					})
				)
			])
		}
		catch (err) {
			console.error(err)
		}
		finally {
			getItemsButton.enable()
		}
	}
	getItemsButton.on('click', handleGetItemsButtonClick)

	const pingButton = firstBySelector('.ping-button')
	const handlePingButtonClick = async () => {
		const pingResponse = await fetch(
			`${localStorage.getItem('gyl-api-url')}/ping`,
			{ mode: 'cors' },
		)
		const data = await pingResponse.json()
		const resultContainer = firstBySelector('.ping-result-container')
		resultContainer.prepend(new Elm({ type: 'pre' }, JSON.stringify(data)))
	}
	pingButton.on('click', handlePingButtonClick)
})
