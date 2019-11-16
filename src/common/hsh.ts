/**
 * Shorthand for document.getElementById, returning HSHElement
 * @param elementId 
 */
export const byId = (elementId: string): HSHElement | null => {
	const element = document.getElementById(elementId)
	if (!element) {
		return null
	}
	return new HSHElement(element)
}

/**
 * Shorthand for document.querySelector, returning HSHElement
 * @param selector 
 */
export const firstBySelector = (selector: string): HSHElement | null => {
	const element = document.querySelector(selector)
	if (!element) {
		return null
	}
	if (!(element instanceof HTMLElement)) {
		throw new Error(`HSHElement only works with HTMLElements. Attempted to `
			+ `convert ${(<any>element).constructor.name}`)
	}
	return new HSHElement(element)
}

/**
 * Shorthand for calling a function when the DOM is ready.
 * @param callback 
 */
export const onDOMReady = (callback: () => any): void => {
	if (document.readyState === 'complete' ||
		document.readyState === 'interactive'
	) {
		return callback();
	}
	document.addEventListener('DOMContentLoaded', callback);
}

/**
 * Abstract data structure for simplified representation of HTML element data.
 */
export class Elm {
	public type?: string
	public attrs?: { [key: string]: string }
	public events?: { [key: string]: (ev: any) => any }
	public options?: string[]
	public value?: string
	public content?: HTMLElement | Elm | string |
		Array<HTMLElement | Elm | string>

	constructor(
		opts: {
			type?: keyof HTMLElementTagNameMap
			attrs?: { [key: string]: string }
			events?: { [key: string]: (ev: any) => any }
			options?: string[]
			value?: string
			text?: string
		} | keyof HTMLElementTagNameMap,
		content?: HTMLElement | Elm | string | Array<HTMLElement | Elm | string>
	) {

		if (typeof opts === 'string') {
			this.type = opts
			this.content = content
		}
		else {
			if (
				(typeof opts.text !== 'undefined') &&
				(typeof content !== 'undefined')
			) {
				throw new Error(
					'Either opts.text or content parameters can be set but not both.'
				)
			}
			this.type = opts.type
			this.attrs = opts.attrs
			this.events = opts.events
			this.options = opts.options
			this.value = opts.value
			if (opts.text) {
				this.content = opts.text
			}
			if (content) {
				this.content = content
			}
		}
	}

	public toHTMLElement(): HTMLElement {
		const elm = document.createElement(this.type)
		if (typeof this.content === 'string') {
			elm.textContent = this.content
		}
		if (Array.isArray(this.content)) {
			this.content.forEach(item => {
				if (item instanceof HTMLElement) {
					elm.appendChild(item)
					return
				}
				if (item instanceof Elm) {
					elm.appendChild(item.toHTMLElement())
					return
				}
				if (typeof item === 'string') {
					const textNode = document.createTextNode(item)
					elm.appendChild(textNode)
				}
			})
		}
		else if (this.content instanceof HTMLElement) {
			elm.appendChild(this.content)
		}
		else if (this.content instanceof Elm) {
			elm.appendChild(this.content.toHTMLElement())
		}
		if (this.attrs) {
			for(let attr in this.attrs) {
				elm.setAttribute(attr, this.attrs[attr])
			}
		}
		if (this.events) {
			for(let eventName in this.events) {
				elm.addEventListener(eventName, this.events[eventName])
			}
		}
		if (this.type === 'select' && Array.isArray(this.options)) {
			this.options.forEach(option => elm.appendChild(new Elm({
				type: 'option',
				value: option,
				text: option,
			}).toHTMLElement()))
		}
		if (this.value && (
			elm instanceof HTMLInputElement || 
			elm instanceof HTMLTextAreaElement
		)) {
			elm.value = this.value
		}
		return elm
	}
}

/**
 * HTML shorthand element - a wrapper for HTMLElements with shorthand functions.
 */
export class HSHElement {

	/** The wrapped HTML element */
	private _element: HTMLElement

	constructor(element: HTMLElement) {
		this._element = element
	}

	/** Returns the value of the element */
	get value(): string | null {
		if (this._element instanceof HTMLInputElement) {
			return (<HTMLInputElement>this._element).value
		}
		if (this._element instanceof HTMLTextAreaElement) {
			return (<HTMLTextAreaElement>this._element).value
		}
		return null
	}

	get element(): HTMLElement {
		return this._element
	}

	get style(): CSSStyleDeclaration {
		return this._element.style
	}

	get classes(): DOMTokenList {
		return this._element.classList
	}

	set text(value: string) {
		this._element.textContent = value
	}

	show(): void {
		this._element.style.display = ''
	}

	hide(): void {
		this._element.style.display = 'none'
	}

	goInvisible(): void {
		this._element.style.visibility = 'hidden'
	}

	disable(): void {
		this._element.setAttribute('disabled', '')
	}

	delete(): void {
		this._element.parentElement.removeChild(this._element)
	}

	enable(): void {
		this._element.removeAttribute('disabled')
	}

	insertBefore(
		newElement: HTMLElement | Elm,
		existingElement: HTMLElement
	): HSHElement {
		if (newElement instanceof HTMLElement) {
			return new HSHElement(
				this._element.insertBefore(newElement, existingElement)
			)
		}
		if (newElement instanceof Elm) {
			return new HSHElement(
				this._element.insertBefore(newElement.toHTMLElement(), existingElement)
			)
		}
	}

	append(element: HTMLElement | Elm): HSHElement {
		if (element instanceof HTMLElement) {
			return new HSHElement(
				this._element.appendChild(element)
			)
		}
		if (element instanceof Elm) {
			return new HSHElement(
				this._element.appendChild(element.toHTMLElement())
			)
		}
	}

	/** Removes all child elements */
	clear(): void {
		while (this._element.lastChild) {
			this._element.removeChild(this._element.lastChild)
		}
	}

	query<E extends Element = Element>(selectors: string): HSHElement | null;
	query<K extends keyof HTMLElementTagNameMap>(
		selectors: K
	): HSHElement | null {
		const result = this._element.querySelector(selectors)
		if (!result) {
			return null
		}
		return new HSHElement(result)
	}

	/** Shorthand for addEventListener */
	on<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions
	): void {
		this._element.addEventListener(type, listener, options)
	}
}

export const hsh = {
	byId,
	firstBySelector,
	onDOMReady,
}
