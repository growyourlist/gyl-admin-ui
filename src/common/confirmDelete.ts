import { HSHElement, Elm } from "./hsh/hsh";

/**
 * Asks the user to confirm the deletion of a template.
 * @param message
 */
export const confirmDelete = async (message: string) =>
	new Promise(resolve => {
		const body = new HSHElement(document.body);
		const confirmDialog = new Elm(
			{ type: 'div', attrs: { class: 'dialog-overlay' } },
			new Elm({ type: 'div', attrs: { class: 'dialog-box' } }, [
				new Elm(
					{
						type: 'div',
						attrs: { class: 'dialog-message' },
					},
					message
				),
				new Elm(
					{
						type: 'div',
						attrs: { class: 'dialog-buttons-box' },
					},
					[
						new Elm({
							type: 'button',
							attrs: { class: 'ok-button' },
							text: 'OK',
							events: {
								click: () => {
									const dialog = body.query('.dialog-overlay');
									dialog.removeSelf();
									resolve(true);
								},
							},
						}),
						new Elm({
							type: 'button',
							text: 'Cancel',
							events: {
								// Rudimentary way to trap focus in confirm dialog
								blur: () => {
									body.query('.dialog-overlay .ok-button').focus();
								},
								click: () => {
									const dialog = body.query('.dialog-overlay');
									dialog.removeSelf();
									resolve(false);
								},
							},
						}),
					]
				),
			])
		);
		body.append(confirmDialog);
		body.query('.dialog-overlay .ok-button').focus();
	});
