import { Elm } from "./Elm"

export { Elm }

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
 * Shorthand for document.querySelectorAll, returning HSHElement[]
 * @param selector 
 */
export const bySelector = (selector: string): HSHElement[] => {
	const elements = document.querySelectorAll(selector)
	if (!elements.length) {
		return []
	}
	const hshElements: HSHElement[] = []
	elements.forEach(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error(`HSHElement only works with HTMLElements. Attempted to `
				+ `convert ${(<any>element).constructor.name}`)
			}
		hshElements.push(new HSHElement(element))
	})
	return hshElements
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

	get parent(): HSHElement {
		return new HSHElement(this._element.parentElement)
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
		existingElement: HTMLElement | HSHElement,
	): HSHElement {
		if (existingElement instanceof HTMLElement) {
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

		if (existingElement instanceof HSHElement) {
			if (newElement instanceof HTMLElement) {
				return new HSHElement(
					this._element.insertBefore(newElement, existingElement.element)
				)
			}
			if (newElement instanceof Elm) {
				return new HSHElement(
					this._element.insertBefore(newElement.toHTMLElement(), existingElement.element)
				)
			}
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

	removeSelf() {
		this._element.parentElement.removeChild(this._element)
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
