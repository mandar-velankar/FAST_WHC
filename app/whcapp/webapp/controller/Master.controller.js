sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (BaseController, JSONModel, Device) {
	"use strict";

	return BaseController.extend("com.bayer.tender.whcapp.controller.Master", {
		onInit: function () {
			const viewModel = new JSONModel({
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText")
			});

			this.setModel(viewModel, "masterView");

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().getRoute("object").attachPatternMatched(this._onMasterMatched, this);

			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.getView().setModel(this.oMessageManager.getMessageModel(), "message");

			this.oMessageManager.registerObject(this.getView(), true);
		},
		onSelectionChange: function (oEvent) {
			const data = oEvent.getParameter("listItem").getBindingContext().getObject();
			data?.ID && this._showDetail(data.ID);
		},
		_onMasterMatched: async function (event) {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
			this.byId("masterTable").removeSelections(true);
		},
		_showDetail: function (id) {
			var bReplace = !Device.system.phone;
			this.getRouter().navTo("object", { id: id }, bReplace);
		}
	});

});