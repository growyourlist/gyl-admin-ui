import { HSHElement, Elm, firstBySelector } from '../common/hsh/hsh';
import { validateElement } from '../common/validateElement';

const validateTagName = (inputElm: HTMLInputElement): void => {
	validateElement(inputElm, {
		pattern: {
			rule: /^[\w-]+$/,
			message: 'Tag name can only contain characters and hyphens',
		},
		required: {
			message: 'Tag name is required',
			rule: true,
		}
	})
}

export class TagsControl {
	private tagsContainer?: HSHElement = null;
	private tagList?: HSHElement = null;
	private addTagButton?: HSHElement = null;
	private newTagName?: HSHElement = null;

	constructor(selector: string) {
		this.tagsContainer = firstBySelector(selector);
		if (!this.tagsContainer) {
			return;
		}
		const buttonSelector = '.add-tag-button';
		this.tagList = this.tagsContainer.query('.tag-list');
		this.newTagName = this.tagsContainer.query('.new-tag-name');
		this.addTagButton = this.tagsContainer.query(buttonSelector);
		if (!(this.tagList && this.newTagName && this.addTagButton)) {
			throw new Error(
				'TagsControl requires list, new tag name and button elements'
			);
		}

		this.newTagName.setAttribute(
			'data-linked-button-selector',
			`${selector} ${buttonSelector}`
		);

		this.addTagButton.disable();

		this.newTagName.on(['change', 'keyup'], () => {
			validateTagName(<HTMLInputElement>this.newTagName.element)
		});
		if (this.newTagName.value) {
			validateTagName(<HTMLInputElement>this.newTagName.element)
		}

		this.addTagButton.on('click', () => {
			this.addTag(this.newTagName.value)
		})

		this.newTagName.on('keypress', (event) => {
			if (event.code === 'Enter' && this.newTagName.value.trim()) {
				event.preventDefault()
				event.stopPropagation()
				this.addTag(this.newTagName.value)
			}
		})
	}

	hide() {
		this.tagsContainer.hide();
	}

	show() {
		this.tagsContainer.show();
	}

	addTag(newTagNameStr: string): void {
		this.newTagName.clear()
		this.addTagButton.disable()
		if (this.tagList.query('.no-tags')) {
			this.tagList.clear()
		}
		if (this.hasTag(newTagNameStr)) {
			this.newTagName.focus()
			return
		}
		const tagList = this.tagList
		const newTagElement: Elm = new Elm(
			{
				type: 'span',
				attrs: { 'class': 'tag m-r-0p5' },
			},
			[
				new Elm({
					type: 'span',
					text: newTagNameStr,
				}),
				new Elm({
					type: 'button',
					text: 'Remove',
					attrs: { class: 'button minor m-l-0p3 inline'},
					events: {
						'click': function() {
							const buttonElm = new HSHElement(this);
							buttonElm.parent.removeSelf();
							if (tagList.isEmpty()) {
								tagList.append(new Elm(
									{
										type: 'em',
										attrs: {'class': 'no-tags'},
										text: '<none>',
									}
								))
							}
						}
					}
				})
			]
		);
		this.tagList.append(newTagElement)
		this.newTagName.focus()
	}

	hasTag(tag: string): boolean {
		const currentTags = this.getTags();
		if (currentTags.indexOf(tag) >= 0) {
			return true;
		}
		return false;
	}

	getTags(): string[] {
		const tagElements = this.tagList.queryAll('.tag span:first-child')
		const tagValues = tagElements.map(elm => elm.text)
		return tagValues
	}
}
