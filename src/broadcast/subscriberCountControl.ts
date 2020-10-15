import { HSHElement, firstBySelector, Elm } from '../common/hsh/hsh';
import { TagsControl } from './tagsControl';
import { PropertiesControl } from './propertiesControl';
import { InteractionsControl } from './interactionsControl';
import { apiRequest } from '../common/apiRequest';
import { ListsControl } from './listsControl';
import { InteractionWithAnyEmailControl } from './InteractionWithAnyEmailControl';
import { IgnoreConfirmedControl } from './IgnoreConfirmedControl';

export class SubscriberCountControl {
	private container: HSHElement;
	private status: HSHElement;
	private button: HSHElement;
	private countElm: HSHElement;

	constructor(
		selector: string,
		private readonly listsControl: ListsControl,
		private readonly tagsControl: TagsControl,
		private readonly excludeTagsControl: TagsControl,
		private readonly propertiesControl: PropertiesControl,
		private readonly interactionsControl: InteractionsControl,
		private readonly interactionWithAnyEmailControl: InteractionWithAnyEmailControl,
		private readonly ignoreConfirmedControl: IgnoreConfirmedControl,
	) {
		this.container = firstBySelector(selector);
		this.status = this.container.query('#subscriber-count-status');
		this.button = this.container.query('#count-subscribers-button');
		this.countElm = this.container.query('#subscriber-count');
		this.button.on('click', () => this.startSubscriberCount());
	}

	hide() {
		this.container.hide();
	}

	show() {
		this.container.show();
	}

	private showError(err: Error) {
		this.status.clear();
		this.status.append(
			new Elm({
				type: 'span',
				attrs: { class: 'color-error' },
				text: `Error: ${err.message}`,
			})
		);
		console.error(err);
	}

	private async doCount() {
		let hitError = false;
		do {
			try {
				const res = await apiRequest(`/admin/subscriber-count`);
				const statusResponse = await res.json();
				this.countElm.text = statusResponse.count;
				if (statusResponse.status === 'complete') {
					this.status.text = '';
					this.button.enable();
					return;
				}
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (err) {
				this.showError(err);
				hitError = true;
			}
		} while (!hitError);
		this.button.enable();
	}

	async startSubscriberCount() {
		const list = this.listsControl.getList();
		const tagsInput = this.tagsControl.getTags();
		const tags = [list].concat(tagsInput);
		const excludeTags = this.excludeTagsControl.getTags();
		const properties = this.propertiesControl.getProperties();
		const interactions = this.interactionsControl.getInteractions();
		const interactionWithAnyEmail = this.interactionWithAnyEmailControl.getInteractionWithAnyEmailFilter();
		const ignoreConfirmed = this.ignoreConfirmedControl.getIgnoreConfirmed()
		this.status.text = 'Counting... ';
		this.button.disable();
		try {
			await apiRequest('/admin/subscriber-count', {
				method: 'POST',
				body: JSON.stringify({ tags, excludeTags, properties, interactions, interactionWithAnyEmail, ignoreConfirmed }),
			});
			// No need to await, it's intended that it runs on a separate thread
			this.doCount();
		} catch (err) {
			this.showError(err);
			this.button.enable();
		}
	}
}
