/** @odoo-module **/
/* global window, setTimeout, document, clearTimeout */
import {_t} from "@web/core/l10n/translation";
import {
    Component,
    onMounted,
    onWillStart,
    onWillUnmount,
    signal,
    useProps,
} from "@odoo/owl";
import {AlertDialog} from "@web/core/confirmation_dialog/confirmation_dialog";
import {renderToElement} from "@web/core/utils/render";
import {useService} from "@web/core/utils/hooks";

/**
 * Record of a client action (configure, preview). Odoo 20 restores a client
 * action from the URL without its params: the record is kept in the action
 * state (updateActionState), which comes back as props.state on reload.
 */
export function resolveActionRecord(props) {
    const params = props.action.params || {};
    const context = props.action.context || {};
    const state = props.state || {};
    const record = {
        res_id: params.res_id || context.active_id || state.res_id,
        model: params.res_model || context.active_model || state.res_model,
    };
    if (props.updateActionState && record.model && record.res_id) {
        props.updateActionState({res_model: record.model, res_id: record.res_id});
    }
    return record;
}

export default class SignOcaPdfCommon extends Component {
    static template = "sign_oca.SignOcaPdfCommon";
    // OWL 3: props are declared with useProps(); subclasses extend propsSchema.
    static propsSchema = {};
    props = useProps(this.constructor.propsSchema);

    setup() {
        super.setup(...arguments);
        this.orm = useService("orm");
        this.field_template = "sign_oca.sign_iframe_field";
        this.pdf_url = this.getPdfUrl();
        this.viewer_url = "/web/static/lib/pdfjs/web/viewer.html?file=" + this.pdf_url;
        this.iframe = signal.ref();
        var iframeResolve = "";
        var iframeReject = "";
        this.iframeLoaded = new Promise(function (resolve, reject) {
            iframeResolve = resolve;
            iframeReject = reject;
        });
        this.items = {};
        onWillUnmount(() => {
            clearTimeout(this.reviewFieldsTimeout);
        });
        this.iframeLoaded.resolve = iframeResolve;
        this.iframeLoaded.reject = iframeReject;
        onWillStart(this.willStart.bind(this));
        onMounted(() => {
            this.waitIframeLoaded();
        });
        this.dialogService = useService("dialog");
    }
    getPdfUrl() {
        return "/web/content/" + this.model + "/" + this.res_id + "/data";
    }
    async willStart() {
        this.info = await this.orm.call(this.model, "get_info", [[this.res_id]]);
    }
    waitIframeLoaded() {
        var error = this.iframe().contentDocument.getElementById("errorWrapper");
        if (error && window.getComputedStyle(error).display !== "none") {
            this.iframeLoaded.resolve();
            return this.dialogService.add(AlertDialog, {
                body: _t("Need a valid PDF to add signature fields !"),
            });
        }
        var nbPages =
            this.iframe().contentDocument.getElementsByClassName("page").length;
        var nbLayers =
            this.iframe().contentDocument.getElementsByClassName("endOfContent").length;
        if (nbPages > 0 && nbLayers > 0) {
            this.postIframeFields();
            this.reviewFields();
        } else {
            var self = this;
            setTimeout(function () {
                self.waitIframeLoaded();
            }, 50);
        }
    }
    reviewFields() {
        if (
            this.iframe().contentDocument.getElementsByClassName("o_sign_oca_ready")
                .length === 0
        ) {
            this.postIframeFields();
        }
        this.reviewFieldsTimeout = setTimeout(this.reviewFields.bind(this), 1000);
    }
    postIframeFields() {
        this.iframe()
            .contentDocument.getElementById("viewerContainer")
            .addEventListener(
                "drop",
                (e) => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                },
                true
            );
        var iframeCss = document.createElement("link");
        iframeCss.setAttribute("rel", "stylesheet");
        iframeCss.setAttribute("href", "/sign_oca/get_assets.css");

        var iframeJs = document.createElement("script");
        iframeJs.setAttribute("type", "text/javascript");
        iframeJs.setAttribute("src", "/sign_oca/get_assets.js");
        this.iframe().contentDocument.getElementsByTagName("head")[0].append(iframeCss);
        this.iframe().contentDocument.getElementsByTagName("head")[0].append(iframeJs);
        for (const key in this.info.items) {
            this.postIframeField(this.info.items[key]);
        }
        const doc = this.iframe().contentDocument;
        const ready = doc.createElement("div");
        ready.className = "o_sign_oca_ready";
        doc.getElementsByClassName("page")[0].append(ready);
        doc.getElementById("viewer").classList.add("sign_oca_ready");
        this.iframeLoaded.resolve();
    }
    postIframeField(item) {
        if (this.items[item.id]) {
            this.items[item.id].remove();
        }
        var page =
            this.iframe().contentDocument.getElementsByClassName("page")[item.page - 1];
        // Returns the field element itself (it used to be a jQuery object).
        const signatureItem = renderToElement(this.field_template, {
            ...item,
        });
        page.append(signatureItem);
        this.items[item.id] = signatureItem;
        return signatureItem;
    }
    // CheckSignItemsCompletion and navigate functions for handling navigation
    checkSignItemsCompletion() {
        const signItemsToComplete = [];
        for (const value of Object.values(this.info.items)) {
            const el = this.postIframeField(value);
            if (el) {
                signItemsToComplete.push({data: value, el});
            }
        }
        return signItemsToComplete;
    }
}
