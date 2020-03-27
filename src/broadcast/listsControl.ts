import {
	Elm,
	HSHElement,
	firstBySelector,
} from '../common/hsh/hsh';
import { List, fetchListsList } from '../common/api';

export class ListsControl {
	private container: HSHElement;
	private listElement: HSHElement;
	private changeListeners: (() => {})[];

	constructor(selector: string) {
		this.container = firstBySelector(selector);
		this.listElement = this.container.query('#lists-list');
		this.changeListeners = [];
	}

	private renderLists(lists: List[]) {
		this.listElement.append(
			new Elm(
				{
					type: 'div',
					attrs: { class: 'm-t-0p5' },
				},
				lists.map(
					list =>
						new Elm('div', [
							new Elm('label', [
								new Elm({
									type: 'input',
									attrs: {
										type: 'radio',
										name: 'target-list',
										value: list.id,
										class: 'list-id',
									},
								}),
								new Elm({ type: 'span' }, ` ${list.name} (${list.id})`),
							]),
						])
				)
			)
		);
		if (lists.length === 1) {
			this.listElement.query('[name="target-list"]').checked = true;
		}
	}

	hide() {
		this.container.hide();
	}

	show() {
		this.container.show();
	}

	async loadLists() {
		try {
			this.listElement.clear();
			this.listElement.append(new Elm('p', 'Loading...'));
			const lists = await fetchListsList();
			this.listElement.clear();
			this.renderLists(lists);
		} catch (err) {
			console.error(err);
			this.listElement.clear();
			this.listElement.append(
				new Elm(
					{
						type: 'p',
						attrs: { class: 'color-error' },
					},
					`Error: ${err.message}`
				)
			);
		}
	}

	getList(): string {
		const lists = this.listElement.queryAll('[name="target-list"]');
		for (let i = 0; i < lists.length; i++) {
			const list = lists[i];
			if (list.checked) {
				return list.value;
			}
		}
	}
}
