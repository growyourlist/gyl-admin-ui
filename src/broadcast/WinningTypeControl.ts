// eslint-disable-next-line no-unused-vars
import { firstBySelector, HSHElement } from "../common/hsh/hsh";

export class WinningTypeControl {
	private wrapper: HSHElement;
	private selectWinningType: HSHElement;

	constructor(selector: string)	 {
		this.wrapper = firstBySelector(selector);
		this.selectWinningType = this.wrapper.query('#winning-email-method')
	}

	hide() {
		this.wrapper.hide();
	}

	show() {
		this.wrapper.show();
	}

	getWinningType(): string | undefined {
		if (this.selectWinningType.value) {
			return this.selectWinningType.value;
		}
	}
}
