/** @odoo-module **/
import {ControlPanel} from "@web/search/control_panel/control_panel";
import SignOcaPdfCommon, {
    resolveActionRecord,
} from "../sign_oca_pdf_common/sign_oca_pdf_common.esm.js";
import {registry} from "@web/core/registry";
import {standardActionServiceProps} from "@web/webclient/actions/action_plugin";

export default class SignOcaPreview extends SignOcaPdfCommon {
    static template = "sign_oca.SignOcaPreview";
    static components = {...SignOcaPdfCommon.components, ControlPanel};
    static propsSchema = {...standardActionServiceProps};

    setup() {
        const record = resolveActionRecord(this.props);
        this.res_id = record.res_id;
        this.model = record.model;
        super.setup(...arguments);
    }
}
registry.category("actions").add("sign_oca_preview", SignOcaPreview);
