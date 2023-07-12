sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("com.bayer.tender.whcapp.controller.Detail", {
		views:{},

		onInit: function () {
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.setModel(oViewModel, "detailView");
            
			// set message model
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.getView().setModel(this.oMessageManager.getMessageModel(), "message");

			// activate automatic message generation for complete view
			this.oMessageManager.registerObject(this.getView(), true);
		},
		_onObjectMatched: async function (oEvent) {
			this.id = oEvent.getParameter("arguments").id;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

			this.getModel().metadataLoaded().then(()=>this._bindView());
		},
		_bindView: async function () {
			const path = this.getModel().createKey("/Contracts", {
					ID :  this.id
				});

			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);
			this.getModel("appView").setProperty("/editmode", false);

			this.getView().bindElement({
				path:path,
				parameters: {
					expand: "ContractCustomers"
				},
				events: {
				// 	change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},
		onEdit: function () {
			const editmode = this.getModel("appView").getProperty("/editmode");
			this.getModel("appView").setProperty("/editmode", !editmode);
		},
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			this.getView().unbindElement();
			this.getRouter().navTo("master");
		},
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		}
	});

});