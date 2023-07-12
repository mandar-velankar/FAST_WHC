sap.ui.define([
	"./BaseController",
    "sap/ui/model/json/JSONModel"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController,JSONModel) {
        "use strict";

        return BaseController.extend("com.bayer.tender.whcapp.controller.App", {
            onInit: function () {
                const viewModel = new JSONModel({
                    busy: true,
                    delay: 0,
                    layout: "OneColumn",
                    previousLayout: "",
                    actionButtonsInfo: {
                        midColumn: {
                            fullScreen: false
                        }
                    }
                });
                this.setModel(viewModel, "appView");

                // apply content density mode to root view
                this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
            }
        });
    });
