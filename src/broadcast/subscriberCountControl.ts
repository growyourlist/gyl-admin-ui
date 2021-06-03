// eslint-disable-next-line no-unused-vars
import { HSHElement, firstBySelector, Elm } from '../common/hsh/hsh';
// eslint-disable-next-line no-unused-vars
import { TagsControl } from './tagsControl';
// eslint-disable-next-line no-unused-vars
import { PropertiesControl } from './propertiesControl';
// eslint-disable-next-line no-unused-vars
import { InteractionsControl } from './interactionsControl';
import { apiRequest } from '../common/apiRequest';
// eslint-disable-next-line no-unused-vars
import { ListsControl } from './listsControl';
// eslint-disable-next-line no-unused-vars
import { InteractionWithAnyEmailControl } from './InteractionWithAnyEmailControl';
// eslint-disable-next-line no-unused-vars
import { IgnoreConfirmedControl } from './IgnoreConfirmedControl';
// eslint-disable-next-line no-unused-vars
import { JoinedAfterControl } from './joinedAfterControl';

export class SubscriberCountControl {
	private container: HSHElement;
	private status: HSHElement;
	private button: HSHElement;
	private countElm: HSHElement;

	constructor(
		selector: string,
		// eslint-disable-next-line no-unused-vars
		private readonly listsControl: ListsControl,
		// eslint-disable-next-line no-unused-vars
		private readonly tagsControl: TagsControl,
		// eslint-disable-next-line no-unused-vars
		private readonly excludeTagsControl: TagsControl,
		// eslint-disable-next-line no-unused-vars
		private readonly joinedAfterControl: JoinedAfterControl,
		// eslint-disable-next-line no-unused-vars
		private readonly propertiesControl: PropertiesControl,
		// eslint-disable-next-line no-unused-vars
		private readonly interactionsControl: InteractionsControl,
		// eslint-disable-next-line no-unused-vars
		private readonly interactionWithAnyEmailControl: InteractionWithAnyEmailControl,
		// eslint-disable-next-line no-unused-vars
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
		const joinedAfter = this.joinedAfterControl.getJoinedAfter();
		const properties = this.propertiesControl.getProperties();
		const interactions = this.interactionsControl.getInteractions();
		const interactionWithAnyEmail = this.interactionWithAnyEmailControl.getInteractionWithAnyEmailFilter();
		const ignoreConfirmed = this.ignoreConfirmedControl.getIgnoreConfirmed()
		this.status.text = 'Counting... ';
		this.button.disable();
		try {
			await apiRequest('/admin/subscriber-count', {
				method: 'POST',
				body: JSON.stringify({
					tags,
					excludeTags,
					properties,
					interactions,
					interactionWithAnyEmail,
					ignoreConfirmed,
					joinedAfter,
				}),
			});
			// No need to await, it's intended that it runs on a separate thread
			this.doCount();
		} catch (err) {
			this.showError(err);
			this.button.enable();
		}
	}
}
