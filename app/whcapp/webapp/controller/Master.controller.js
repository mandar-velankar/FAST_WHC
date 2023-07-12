sap.ui.define([
	"./BaseController",
	"sap/ui/core/Component",
	"sap/ui/core/ComponentContainer",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterType",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"../model/formatter",
	"sap/m/ColumnListItem",
	"sap/ui/core/Item",
	"sap/m/MessageToast",
	"../service/StandardSingletonService"
], function (BaseController, Component, ComponentContainer, JSONModel, Filter, FilterType, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, formatter, ColumnListItem, Item, MessageToast, StandardSingletonService) {
	"use strict";

	return BaseController.extend("com.bayer.tender.whcapp.controller.Master", {
		formatter: formatter,
		onInit: function () {
			// Control state model
			var list = this.byId("masterTable"),
				oViewModel = this._createViewModel();

			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};

			this.orFilters = [];
			this.andFilters = [];

			const messagesModel = new JSONModel({
				newTenderMsg: [],
			})
			this.setModel(messagesModel, "messages");

			this.setModel(oViewModel, "masterView");

			this.getView().addEventDelegate({
				onBeforeFirstShow: function () {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().getRoute("object").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);

			// set message model
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.getView().setModel(this.oMessageManager.getMessageModel(), "message");

			// activate automatic message generation for complete view
			this.oMessageManager.registerObject(this.getView(), true);

			const oModel = this.getOwnerComponent().getModel();
		},
		onUpdateFinished: function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
		},

		onSelectionChange: function (oEvent) {
			var oList = oEvent.getSource(),
				data = oEvent.getParameter("listItem").getBindingContext().getObject(),//oEvent.getParameter("data"),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(data || oList);
			}
		},
		onBypassed: function () {
			this._oList.removeSelections(true);
		},

		onNavBack: function () {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},
		_createViewModel: function () {
			return new JSONModel({
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText")
			});
		},

		_onMasterMatched: async function (oEvent) {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

		},
		_showDetail: function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("object", {
				countryCode: oItem.CountryCode,
				objectId: oItem.TenderID, //getBindingContext().getProperty("TenderID")
				offerId: oItem?.OfferID || "NA"
			}, bReplace);
		}
	});

});