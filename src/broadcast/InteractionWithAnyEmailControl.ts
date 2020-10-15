import {
	byId,
	HSHElement,
	Elm,
	bySelector,
	firstBySelector,
} from '../common/hsh/hsh';
import { apiRequest } from '../common/apiRequest';

export class InteractionWithAnyEmailControl {
	private wrapper: HSHElement;
	private useAnyEmailInteractionsRadios: HSHElement[];
	private filterControlsWrapper: HSHElement;
	private interactionType: HSHElement;
	private interactionPeriod: HSHElement;

	constructor(selector: string) {
		this.wrapper = firstBySelector(selector);
		this.useAnyEmailInteractionsRadios = this.wrapper.queryAll(
			'[name="use-interactions-with-any-email"]'
		);
		this.filterControlsWrapper = this.wrapper.query(
			'#interaction-with-any-email-controls-wrapper'
		);
		this.interactionType = this.wrapper.query(
			'#interaction-with-any-email-type'
		);
		this.interactionPeriod = this.wrapper.query(
			'#interaction-with-any-email-period'
		);
		this.useAnyEmailInteractionsRadios.forEach((radio) => {
			if (radio.checked && radio.value === 'yes') {
				this.filterControlsWrapper.show();
			}
			radio.on('click', (event) => {
				const value = (event.target as HTMLInputElement).value;
				if (value === 'yes') {
					this.filterControlsWrapper.show();
				} else {
					this.filterControlsWrapper.hide();
				}
			});
		});
	}

	getUseInteractionWithAnyEmailFilter() {
		const yesElement = this.wrapper.query('[name="use-interactions-with-any-email"][value="yes"]');
		return yesElement.checked;
	}

	hide() {
		this.wrapper.hide();
	}

	show() {
		this.wrapper.show();
	}

	getInteractionWithAnyEmailFilter(): {
		interactionType: string
		interactionPeriodValue: number
		interactionPeriodUnit: 'days'
	} | null {
		if (!this.getUseInteractionWithAnyEmailFilter()) {
			return null;
		}
		return {
			interactionType: this.interactionType.value,
			interactionPeriodValue: this.interactionPeriod.valueAsNumber,
			interactionPeriodUnit: 'days',
		};
	}
}
