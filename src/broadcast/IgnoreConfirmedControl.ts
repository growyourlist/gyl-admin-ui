// eslint-disable-next-line no-unused-vars
import { firstBySelector, Elm, HSHElement } from '../common/hsh/hsh';

export class IgnoreConfirmedControl {
	private wrapper: HSHElement;
	private radioYes: HSHElement;
	private radioNo: HSHElement;
	private radioYesLabel: HSHElement;

	constructor(selector: string) {
		this.wrapper = firstBySelector(selector);
		this.radioNo = this.wrapper.query('#ignore-confirmed-radio-no');
		this.radioYes = this.wrapper.query('#ignore-confirmed-radio-yes');
		this.radioYesLabel = this.wrapper.query(
			'#ignore-confirmed-radio-yes-label'
		);
		this.radioYes.on('change', () => {
			if (this.radioYes.checked) {
				this.addWarningNote()
			}
		});
		this.radioNo.on('change', () => {
			if (!this.radioYes.checked) {
				this.removeWarningNote()
			}
		});
		if (this.radioYes.checked) {
			this.addWarningNote()
		}
	}

	addWarningNote() {
		this.radioYesLabel.style.setProperty('color', '#c6520d');
		this.radioYesLabel.style.setProperty('font-weight', 'bold');
		this.radioYesLabel.append(
			new Elm({
				type: 'span',
				class: 'warning-note',
				text: ' (See warning note above)',
				attrs: { 'style': 'font-weight:normal'},
			})
		);
	}

	removeWarningNote() {
		this.radioYesLabel.style.removeProperty('color');
		this.radioYesLabel.style.removeProperty('font-weight');
		this.radioYesLabel.query('.warning-note').removeSelf();
	}

	hide() {
		this.wrapper.hide();
	}

	show() {
		this.wrapper.show();
	}

	getIgnoreConfirmed(): boolean {
		if (this.radioNo.checked) {
			return false;
		}
		return this.radioYes.checked;
	}
}
