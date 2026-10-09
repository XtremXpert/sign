/** @odoo-module */
/* Copyright 2024 Tecnativa - Carlos Roca
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl). */

import {Dialog} from "@web/core/dialog/dialog";

import {Component, signal, t, useProps} from "@odoo/owl";

export class SignOcaConfigureFieldDialog extends Component {
    static template = "sign_oca.SignOcaConfigureFieldDialog";
    static components = {Dialog};
    props = useProps({
        close: t.function(),
        title: t.any(),
        item: t.object(),
        info: t.object(),
        confirm: t.function(),
        delete: t.function(),
    });

    setup() {
        this.env.dialogData.dismiss = () => this._cancel();
        // Ref on the modal element, handed to Dialog through its modalRef prop.
        this.modalRef = signal.ref();
        this.isProcess = false;
    }

    get titleText() {
        // Dialog expects a string; the title may be a lazy translation.
        return String(this.props.title);
    }

    async _cancel() {
        this.props.close();
    }

    async _confirm() {
        const el = this.modalRef();
        await this.props.confirm(
            parseInt(el.querySelector('select[name="field_id"]').value, 10),
            parseInt(el.querySelector('select[name="role_id"]').value, 10),
            el.querySelector("input[name='required']").checked,
            el.querySelector("input[name='placeholder']").value
        );
        this.props.close();
    }

    async _delete() {
        this.props.delete();
        this.props.close();
    }
}
