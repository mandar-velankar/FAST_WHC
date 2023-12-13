sap.ui.define([
	"./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController,JSONModel, MessageBox) {
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
                this.getView().addStyleClass("sapUiSizeCompact"); //this.getOwnerComponent().getContentDensityClass()

			//Routing
			this.oOwnerComponent = this.getOwnerComponent();
			this.oRouter = this.getOwnerComponent().getRouter();
			var intervalId = setInterval(()=>{
				var unique = new Date().getTime().toString(16);
				this.getView().getModel("access").setUseBatch(false);
				this.getView().getModel("access").read("/getAccess", {
					urlParameters: { time: unique },
					error: () => {
						clearInterval(intervalId);
						MessageBox.warning(this.getText("sessionEnd"), {
							title: this.getText("information"),
							actions: [this.getText("reload")],
							onClose: (sAction) => window.location.reload(true)
						});
					}
				});
				// this.getView().getModel("access").setUseBatch(true);
				// this.getView().getModel("access").refreshMetadata();
			}, 15000);//900000); //15 minutes
            }
        });
    });
