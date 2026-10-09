/** @odoo-module **/
/* global window, document */

import {signal, t, whenReady} from "@odoo/owl";
import {mountComponent} from "@web/env";
import SignOcaPdf from "../sign_oca_pdf/sign_oca_pdf.esm.js";
import {MainComponentsContainer} from "@web/core/main_components_container";
import {rpc} from "@web/core/network/rpc";
import {startSignItemNavigator} from "./sign_oca_navigator.esm";

export class SignOcaPdfPortal extends SignOcaPdf {
    static template = "sign_oca.SignOcaPdfPortal";
    static components = {MainComponentsContainer};
    static propsSchema = {access_token: t.string(), signer_id: t.number()};

    setup() {
        this.rpc = rpc;
        this.signOcaFooter = signal.ref();
        this.signer_id = this.props.signer_id;
        this.access_token = this.props.access_token;
        super.setup(...arguments);
    }
    async willStart() {
        this.info = await this.rpc(
            "/sign_oca/info/" + this.signer_id + "/" + this.access_token
        );
    }
    getPdfUrl() {
        return "/sign_oca/content/" + this.signer_id + "/" + this.access_token;
    }
    checkToSign() {
        this.to_sign = this.to_sign_update;
        const button = document.getElementById("sign_oca_button");
        if (this.signOcaFooter()) {
            this.signOcaFooter().style.display = this.to_sign_update ? "" : "none";
        }
        if (button) {
            button.disabled = !this.to_sign_update;
        }
    }
    postIframeFields() {
        super.postIframeFields(...arguments);
        this.checkFilledAll();
        // Is essential to make sure the navigator will never duplicate
        const doc = this.iframe().contentDocument;
        const target = doc.getElementById("viewerContainer");
        for (const className of [
            "o_sign_sign_item_navline",
            "o_sign_sign_item_navigator",
        ]) {
            if (doc.getElementsByClassName(className).length === 0) {
                const div = doc.createElement("div");
                div.className = className;
                target.append(div);
            }
        }
        // Load navigator
        this.navigate();
    }
    async _onClickSign(ev) {
        ev.target.disabled = true;
        const position = await this.getLocation();
        this.rpc("/sign_oca/sign/" + this.signer_id + "/" + this.access_token, {
            items: this.info.items,
            latitude: position && position.coords && position.coords.latitude,
            longitude: position && position.coords && position.coords.longitude,
        }).then((action) => {
            // As we are on frontend env, it is not possible to use do_action(), so we
            // redirect to the corresponding URL or reload the page if the action is not
            // an url.
            if (action.type === "ir.actions.act_url") {
                window.location = action.url;
            } else {
                window.location.reload();
            }
        });
    }
    navigate() {
        const target = this.iframe().contentDocument.getElementById("viewerContainer");
        this.navigator = startSignItemNavigator(this, target, this.env);
    }
}

export async function initDocumentToSign(document, sign_oca_backend_info) {
    // Odoo 20 / OWL 3: services are App plugins, mountComponent() sets them up.
    await whenReady();
    await mountComponent(SignOcaPdfPortal, document.body, {
        name: "Sign OCA portal",
        props: {
            access_token: sign_oca_backend_info.access_token,
            signer_id: sign_oca_backend_info.signer_id,
        },
    });
}
export default {SignOcaPdfPortal, initDocumentToSign};
