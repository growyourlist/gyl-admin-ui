import { Elm } from '../common/hsh/hsh';
import { apiRequestOrThrow } from '../common/apiRequest';
import { isEmail } from 'validator';

const defaultText = '<list or account default source email>'

export class SourceEmailControl {
	private _root: HTMLElement;
	private _valueSpan: HTMLSpanElement;
	private _templateName: string;
	private _sourceEmail: string;

	constructor({ 
		templateName,
		sourceEmail,
	}: { 
		templateName: string; 
		sourceEmail: string;
		listSourceEmail?: string | null,
	}) {
		this._templateName = templateName;
		this._sourceEmail = sourceEmail;
		this._valueSpan = new Elm({
			type: 'span',
			text: sourceEmail || defaultText,
		}).toHTMLElement() as HTMLSpanElement;
		if (!sourceEmail) {
			this._valueSpan.classList.add('text-placeholder')
		} else {
			this._valueSpan.classList.remove('text-placeholder')
		}

		const changeBtn = new Elm({
			type: 'button',
			class: 'button minor inline',
			text: 'Change',
			events: { click: () => this._openDialog() },
		}).toHTMLElement();

		this._root = new Elm(
			{ type: 'span' },
			[this._valueSpan, ' ', changeBtn]
		).toHTMLElement();
	}

	getElement(): HTMLElement {
		return this._root;
	}

	private async _save(
		newSourceEmail: string,
		dialog: HTMLDialogElement,
		saveBtn: HTMLButtonElement,
		cancelBtn: HTMLButtonElement,
		errElm: HTMLElement
	) {
		try {
			saveBtn.disabled = cancelBtn.disabled = true;
			if (!(newSourceEmail || !isEmail(newSourceEmail, {
				allow_display_name: true,
				require_display_name: false,
				allow_utf8_local_part: true,
				require_tld: true,
				allow_ip_domain: false,
				allow_underscores: false,
				domain_specific_validation: false,
				blacklisted_chars: '',
				host_blacklist: []
			}))) {
				throw new Error('Email address appears to be invalid')
			}
			await apiRequestOrThrow('/admin/template', {
				method: 'PATCH',
				body: JSON.stringify({
					sourceEmail: newSourceEmail || null,
					templateName: this._templateName,
				}),
			});
			this._valueSpan.textContent = newSourceEmail || defaultText;
			this._sourceEmail = newSourceEmail;
			if (!newSourceEmail) {
				this._valueSpan.classList.add('text-placeholder')
			} else {
				this._valueSpan.classList.remove('text-placeholder')
			}
			dialog.close();
			dialog.remove();
		} catch (err) {
			errElm.textContent = `Error updating template: ${err.message}`;
			errElm.style.display = '';
		} finally {
			saveBtn.disabled = cancelBtn.disabled = false;
		}
	}

	private _openDialog() {
		const dialog = document.createElement('dialog');
		dialog.style.width = '500px';
		dialog.style.textAlign = 'center';
		dialog.style.maxWidth = '90vw';
		dialog.innerHTML = `
<form method="dialog" class="change-source-email-dialog">
  <h2>Change sender email</h2>
  <p>Update the sender email for: <b id="template-name-placeholder"></b>.
  	<br>The change is made as soon as <em>Save</em> is clicked but allow up to 10 minutes
	cache time for it to take effect if the email is already in use.
	<br>Save an empty value to revert to list/account default.</p>
  <input id="template-source-email-input" class="input w-100" value="" autofocus>
  <p id="template-source-email-error" class="status error" style="display:none"></p>
  <div class="m-t-1" style='text-align:left;'>
    <button id="template-source-email-cancel-btn" class="button secondary m-r-0p5" value="cancel">Cancel</button>
    <button id="template-source-email-save-btn" style="padding:0.15em 0.6em;font-size:0.9em;" class="button main" value="confirm">Save</button>
  </div>
</form>`;
		document.body.appendChild(dialog);
		const input = dialog.querySelector('#template-source-email-input') as HTMLInputElement;
		const save = dialog.querySelector('#template-source-email-save-btn') as HTMLButtonElement;
		const cancel = dialog.querySelector('#template-source-email-cancel-btn') as HTMLButtonElement;
		const errElm = dialog.querySelector('#template-source-email-error') as HTMLElement;
		const templateName = dialog.querySelector('#template-name-placeholder') as HTMLSpanElement;
		input.value = this._sourceEmail;
		templateName.textContent = this._templateName;
		save.addEventListener('click', (ev) => {
			ev.preventDefault();
			const v = input.value.trim();
			errElm.style.display = 'none';
			this._save(v, dialog, save, cancel, errElm);
		});
		cancel.addEventListener('click', () => dialog.close());
		dialog.addEventListener('close', () => dialog.remove());
		dialog.showModal();
	}
}
