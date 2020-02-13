import { HSHElement, Elm, firstBySelector } from '../common/hsh/hsh';
import { validateElement } from '../common/validateElement';

export class PropertiesControl {
	private propertiesContainer?: HSHElement = null;
	private propertyList?: HSHElement = null;
	private addPropertyButton?: HSHElement = null;
	private propertyName?: HSHElement = null;
	private propertyValue?: HSHElement = null;

	constructor(selector: string) {
		this.propertiesContainer = firstBySelector(selector);
		if (!this.propertiesContainer) {
			return;
		}
		const buttonSelector = '.add-property-button';
		this.propertyList = this.propertiesContainer.query('.property-list');
		this.propertyName = this.propertiesContainer.query('.property-name');
		this.propertyValue = this.propertiesContainer.query('.property-value');
		this.addPropertyButton = this.propertiesContainer.query(buttonSelector);
		if (
			!(
				this.propertyList &&
				this.propertyName &&
				this.propertyValue &&
				this.addPropertyButton
			)
		) {
			throw new Error(
				'PropertiesControl requires list, new property name and value and ' +
					'button elements'
			);
		}

		this.propertyName.setAttribute(
			'data-linked-button-selector',
			`${selector} ${buttonSelector}`
		);

		this.addPropertyButton.disable();

		const validatePropertyName = (): void => {
			validateElement(<HTMLInputElement>this.propertyName.element, {
				required: {
					message: 'Property name is required',
					rule: true,
				},
			});
		};

		this.propertyName.on(['change', 'keyup', 'blur'], () => {
			validatePropertyName();
		});
		if (this.propertyName.value) {
			validatePropertyName();
		}

		this.addPropertyButton.on('click', () => {
			const propertyName = this.propertyName.value;
			const propertyValue = this.propertyValue.value;
			this.addProperty(propertyName, propertyValue);
		});

		this.propertyName.on('keypress', (event) => {
			if (event.keyCode === 13 && this.propertyName.value.trim()) {
				event.preventDefault()
				event.stopPropagation()
				const propertyName = this.propertyName.value;
				const propertyValue = this.propertyValue.value;
				this.addProperty(propertyName, propertyValue);
			}
		})
	}

	hide() {
		this.propertiesContainer.hide();
	}

	show() {
		this.propertiesContainer.show();
	}

	addProperty(newPropertyNameStr: string, newPropertyValueStr: string) {
		const propertyList = this.propertyList;
			if (propertyList.query('.no-properties')) {
				propertyList.clear();
			}
			this.propertyName.clear();
			this.propertyValue.clear();
			this.addPropertyButton.disable();
			if (this.hasProperty(newPropertyNameStr)) {
				this.propertyName.focus();
				return;
			}
			const newPropertyElement: Elm = new Elm(
				{
					type: 'span',
					attrs: { class: 'property m-r-0p5' },
				},
				[
					new Elm('span', [
						new Elm({
							type: 'span',
							attrs: {'class': 'name'},
							text: newPropertyNameStr,
						}),
						' = ',
						new Elm({
							type: 'span',
							attrs: {'class': 'value'},
							text: newPropertyValueStr,
						}),
					]),
					new Elm({
						type: 'button',
						text: 'Remove',
						attrs: { class: 'button minor m-l-0p3 inline' },
						events: {
							click: function() {
								const buttonElm = new HSHElement(this);
								buttonElm.parent.removeSelf();
								if (propertyList.isEmpty()) {
									propertyList.append(
										new Elm({
											type: 'em',
											attrs: { class: 'no-properties' },
											text: '<none>',
										})
									);
								}
							},
						},
					}),
				]
			);
			propertyList.append(newPropertyElement);
			this.propertyName.focus();
	}

	hasProperty(property: string): boolean {
		const properties = this.getProperties()
		return !!Object.keys(properties).find(k => k === property);
	}

	getProperties(): { [key: string]: string } {
		const propertyElements = this.propertyList.queryAll('.property');
		const properties: { [key: string]: string } = {};
		propertyElements.forEach(property => {
			const name = property.query('.name').text;
			const value = property.query('.value').text;
			properties[name] = value;
		});
		return properties;
	}
}
