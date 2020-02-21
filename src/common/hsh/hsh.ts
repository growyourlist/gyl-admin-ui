import { Elm } from './Elm';

export { Elm };

/**
 * Shorthand for document.getElementById, returning HSHElement
 * @param elementId
 */
export const byId = (elementId: string): HSHElement | null => {
	const element = document.getElementById(elementId);
	if (!element) {
		return null;
	}
	return new HSHElement(element);
};

/**
 * Shorthand for document.querySelector, returning HSHElement
 * @param selector
 */
export const firstBySelector = (selector: string): HSHElement | null => {
	const element = document.querySelector(selector);
	if (!element) {
		return null;
	}
	if (!(element instanceof HTMLElement)) {
		throw new Error(
			`HSHElement only works with HTMLElements. Attempted to ` +
				`convert ${(<any>element).constructor.name}`
		);
	}
	return new HSHElement(element);
};

/**
 * Shorthand for document.querySelectorAll, returning HSHElement[]
 * @param selector
 */
export const bySelector = (selector: string): HSHElement[] => {
	const elements = document.querySelectorAll(selector);
	if (!elements.length) {
		return [];
	}
	const hshElements: HSHElement[] = [];
	elements.forEach(element => {
		if (!(element instanceof HTMLElement)) {
			throw new Error(
				`HSHElement only works with HTMLElements. Attempted to ` +
					`convert ${(<any>element).constructor.name}`
			);
		}
		hshElements.push(new HSHElement(element));
	});
	return hshElements;
};

/**
 * Shorthand for calling a function when the DOM is ready.
 * @param callback
 */
export const onDOMReady = (callback: () => any): void => {
	if (
		document.readyState === 'complete' ||
		document.readyState === 'interactive'
	) {
		return callback();
	}
	document.addEventListener('DOMContentLoaded', callback);
};

/**
 * HTML shorthand element - a wrapper for HTMLElements with shorthand functions.
 */
export class HSHElement {
	/** The wrapped HTML element */
	private _element: HTMLElement;

	constructor(element: HTMLElement) {
		this._element = element;
	}

	get checked(): boolean | null {
		if (this._element instanceof HTMLInputElement) {
			return (<HTMLInputElement>this._element).checked;
		}
		return null;
	}

	set checked(value: boolean) {
		const elm = <HTMLInputElement>this._element;
		elm.checked = value;
	}

	/** Returns the value of the element */
	get value(): string | null {
		if (this._element instanceof HTMLInputElement) {
			return (<HTMLInputElement>this._element).value;
		}
		if (this._element instanceof HTMLTextAreaElement) {
			return (<HTMLTextAreaElement>this._element).value;
		}
		if (this._element instanceof HTMLSelectElement) {
			return (<HTMLSelectElement>this._element).value;
		}
		return null;
	}

	get data(): DOMStringMap {
		return this._element.dataset
	}

	get valueAsNumber(): number | null {
		if (this._element instanceof HTMLInputElement) {
			return (<HTMLInputElement>this._element).valueAsNumber
		}
		return null
	}

	set value(value: string) {
		if (this._element instanceof HTMLInputElement) {
			(<HTMLInputElement>this._element).value = value;
		}
		if (this._element instanceof HTMLTextAreaElement) {
			(<HTMLTextAreaElement>this._element).value = value;
		}
	}

	get element(): HTMLElement {
		return this._element;
	}

	get style(): CSSStyleDeclaration {
		return this._element.style;
	}

	get classes(): DOMTokenList {
		return this._element.classList;
	}

	get parent(): HSHElement | null {
		if (!this._element.parentElement) {
			return null;
		}
		return new HSHElement(this._element.parentElement);
	}

	set text(value: string) {
		this._element.textContent = value;
	}

	get text(): string {
		return this._element.textContent;
	}

	set html(value: string) {
		this._element.innerHTML = value;
	}

	get html(): string {
		return this._element.innerHTML;
	}

	isTag(type: string): boolean {
		return this._element.tagName.toLocaleLowerCase() === type.toLocaleLowerCase()
	}

	parentUntil(test: (elm: HSHElement) => boolean): HSHElement | null {
		let parent = this.parent;
		do {
			if (!parent) {
				return null;
			}
			if (test(parent)) {
				return parent;
			}
			parent = parent.parent;
		} while (parent);
		return null;
	}

	show(): void {
		this._element.style.display = '';
	}

	focus(): void {
		this._element.focus();
	}

	hide(): void {
		this._element.style.display = 'none';
	}

	goInvisible(): void {
		this._element.style.visibility = 'hidden';
	}

	disable(): void {
		this._element.setAttribute('disabled', '');
	}

	delete(): void {
		this._element.parentElement.removeChild(this._element);
	}

	enable(): void {
		this._element.removeAttribute('disabled');
	}

	insertBefore(
		newElement: HTMLElement | Elm,
		existingElement: HTMLElement | HSHElement
	): HSHElement {
		if (existingElement instanceof HTMLElement) {
			if (newElement instanceof HTMLElement) {
				return new HSHElement(
					this._element.insertBefore(newElement, existingElement)
				);
			}
			if (newElement instanceof Elm) {
				return new HSHElement(
					this._element.insertBefore(
						newElement.toHTMLElement(),
						existingElement
					)
				);
			}
		}

		if (existingElement instanceof HSHElement) {
			if (newElement instanceof HTMLElement) {
				return new HSHElement(
					this._element.insertBefore(newElement, existingElement.element)
				);
			}
			if (newElement instanceof Elm) {
				return new HSHElement(
					this._element.insertBefore(
						newElement.toHTMLElement(),
						existingElement.element
					)
				);
			}
		}
	}

	insertAfterThis(
		newElement: HTMLElement | Elm,
	): HSHElement {
		const existingElement = this._element;
		if (existingElement instanceof HTMLElement) {
			if (newElement instanceof HTMLElement) {
				return new HSHElement(
					this._element.insertAdjacentElement('afterend', newElement) as HTMLElement
				);
			}
			if (newElement instanceof Elm) {
				return new HSHElement(
					this._element.insertAdjacentElement('afterend',
						newElement.toHTMLElement()
					) as HTMLElement
				);
			}
		}
	}

	prepend(element: HTMLElement | Elm | Array<HTMLElement | Elm>): HSHElement {
		if (Array.isArray(element)) {
			let last = null;
			element.reverse().forEach(item => (last = this.prepend(item)));
			return last;
		}
		if (element instanceof HTMLElement) {
			this._element.prepend(element);
			return new HSHElement(element);
		}
		if (element instanceof Elm) {
			const htmlElement = element.toHTMLElement();
			this._element.prepend(htmlElement);
			return new HSHElement(htmlElement);
		}
	}

	isEmpty(): boolean {
		return this._element.childElementCount === 0;
	}

	isDisabled(): boolean {
		return this._element.getAttribute('disabled') !== null
	}

	append(element: HTMLElement | Elm | Array<HTMLElement | Elm>): HSHElement {
		if (Array.isArray(element)) {
			let last = null;
			element.forEach(item => (last = this.append(item)));
			return last;
		}
		if (element instanceof HTMLElement) {
			return new HSHElement(this._element.appendChild(element));
		}
		if (element instanceof Elm) {
			return new HSHElement(this._element.appendChild(element.toHTMLElement()));
		}
	}

	removeSelf() {
		this._element.parentElement.removeChild(this._element);
	}

	/** Removes all child elements */
	clear(): void {
		if (this._element instanceof HTMLInputElement) {
			this._element.value = '';
			return;
		}
		while (this._element.lastChild) {
			this._element.removeChild(this._element.lastChild);
		}
	}

	query<E extends Element = Element>(selectors: string): HSHElement | null;
	query<K extends keyof HTMLElementTagNameMap>(
		selectors: K
	): HSHElement | null {
		const result = this._element.querySelector(selectors);
		if (!result) {
			return null;
		}
		return new HSHElement(result);
	}

	queryAll<E extends Element = Element>(selectors: string): HSHElement[];
	queryAll<K extends keyof HTMLElementTagNameMap>(selectors: K): HSHElement[] {
		const results = this._element.querySelectorAll(selectors);
		const result: HSHElement[] = [];
		results.forEach(i => result.push(new HSHElement(i)));
		return result;
	}

	/** Shorthand for addEventListener */
	on<K extends keyof HTMLElementEventMap>(
		type: K | K[],
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions
	): void {
		if (Array.isArray(type)) {
			type.forEach(t => this._element.addEventListener(t, listener, options));
		} else {
			this._element.addEventListener(type, listener, options);
		}
	}

	/** Sets an attribute on the element */
	setAttribute(qualifiedName: string, value: string): void {
		this._element.setAttribute(qualifiedName, value);
	}

	/** Removes an attribute from the element */
	removeAttribute(qualifiedName: string): void {
		this._element.removeAttribute(qualifiedName);
	}

	removeEventListener<K extends keyof HTMLElementEventMap>(
		type: K | K[],
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions
	) {
		if (Array.isArray(type)) {
			type.forEach(t => this._element.removeEventListener(t, listener, options));
		} else {
			this._element.removeEventListener(type, listener, options)
		}
	}
}
