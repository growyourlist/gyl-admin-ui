import { Validation } from "./Validation"
import { HSHElement, Elm } from "./hsh/hsh"

/** Validates the given element based on the provide validation rules */
export const validateElement = (
	inputElm: HTMLInputElement | HTMLTextAreaElement,
	validation: Validation
): void => {
	const value = inputElm.value || ''
	let linkedButton: HSHElement | null
	if (inputElm.dataset['linkedButtonSelector']) {
		const linkedButtonMatch = document.querySelector(
			inputElm.dataset['linkedButtonSelector']
		)
		if (linkedButtonMatch) {
			linkedButton = new HSHElement(<HTMLElement>linkedButtonMatch)
		}
	}

	// Remove existing validation messages if they exist.
	const nextElm = inputElm.nextElementSibling
	if (nextElm && nextElm.classList.contains('validation')) {
		nextElm.parentElement.removeChild(nextElm)
	}

	const appendValidationMessage = (
		message: string,
		type: "error" | "warning" = "error"
	): void => {
		inputElm.insertAdjacentElement('afterend', new Elm({
			type: 'div',
			attrs: { class: `validation ${type} grid-width-all-columns` },
			text: message,
		}).toHTMLElement())
	}

	// Perform required check if it exists and is true
	if (validation.required && validation.required.rule) {
		if (!value || value.length < 1) {
			appendValidationMessage(validation.required.message)
			if (linkedButton) {
				linkedButton.disable()
			}
			return
		}
	}

	// Perform max length check if it exists
	if (validation.maxLength && value) {
		if (value.length >= validation.maxLength.rule) {
			if (validation.maxLength.autoCut) {
				inputElm.value = value.substring(0, 64)
				appendValidationMessage(validation.maxLength.message, 'warning')
			}
			else {
				appendValidationMessage(validation.maxLength.message)
				if (linkedButton) {
					linkedButton.disable()
				}
				return
			}
		}
	}

	// Perform pattern check
	if (validation.pattern && value && !validation.pattern.rule.test(value)) {
		appendValidationMessage(validation.pattern.message)
		if (linkedButton) {
			linkedButton.disable()
		}
		return
	}

	// Perform email check using regex.
	// See https://tylermcginnis.com/validate-email-address-javascript/
	if (validation.email && value) {
		const emailPatternWithLabel = /^.*<[^\s@]+@[^\s@]+\.[^\s@]+>$/
		const matchesLabelPattern = emailPatternWithLabel.test(value)
		if (matchesLabelPattern) {
			if (value.length > 256) {
				if (linkedButton) {
					linkedButton.disable()
				}
				appendValidationMessage(validation.email.message)
				return
			}
	
			// Email with label and valid length, can return at this point
			return
		}
		const emailPatternBasic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		const matchesBasicPattern = emailPatternBasic.test(value)
		if (matchesBasicPattern) {
			if (value.length > 254) {
				if (linkedButton) {
					linkedButton.disable()
				}
				appendValidationMessage(validation.email.message)
				return
			}
		}
		else {
			if (linkedButton) {
				linkedButton.disable()
			}
			appendValidationMessage(validation.email.message)
			return
		}
	}
	if (linkedButton) {
		linkedButton.enable()
	}
}