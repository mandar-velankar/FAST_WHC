sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/Fragment",
	"sap/m/MessagePopover",
	"sap/m/MessageItem",
	"../model/datatypes/CustomDecimalType",
	"../model/datatypes/CustomPercentageType",
	"../model/datatypes/CustomNumberType"
], function (Controller, History,MessagePopover, MessageItem, CustomDecimalType, CustomPercentageType, CustomNumberType) {
	"use strict";

	return Controller.extend("com.bayer.tender.whcapp.controller.BaseController", {
		
		customTypes: {
			persentage: CustomPercentageType,
			number: CustomNumberType,
			decimal: CustomDecimalType
		},
		getRouter : function () {
			return this.getOwnerComponent().getRouter();
		},

		getText: function (key, params) {
			return this.getResourceBundle().getText(key, params);
		},

		fieldsFactory: function (id, context) {
			const control = context.getObject();
			return control.generateControl();
		},

		sorterFactory: function (id, context) {
			const i18nModel = this.getModel("i18n");
			const index = parseInt(context.getPath().split('/').pop());
			const control = context.getObject();
			return control.generateViewSettingsItem(index, i18nModel);
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel : function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel : function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle : function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},
		onMessagePopoverPress : function (oEvent, sectionName) {
			const oSourceControl = oEvent.getSource();
			const popover = this.createMessagePopover(sectionName);
			const messagesModel = this.getModel("messages");
			popover.setModel(messagesModel, "messages");
			popover.openBy(oSourceControl)
			// this._getMessagePopover().then(function(oMessagePopover){
			// 	oMessagePopover.openBy(oSourceControl);
			// });
		},
		createMessagePopover: function (sectionName) {
			return new MessagePopover({
				items: {
					path: `messages>/${sectionName}`,
					template: new MessageItem({
						type: "{messages>type}",
						title: "{messages>message}",
						subtitle: "{messages>additionalText}",
						description: "{messages>description}"
					})
				}
			})
		},
		cancelPendingChanges: function(entities, msgPropName){
			const targets = this.getTargets(entities);
			const messages = this.getMessages(entities);
			const messageManager = sap.ui.getCore().getMessageManager();
			messageManager.removeMessages(messages);
			this.getModel("messages").setProperty(`/${msgPropName}`, {});
			this.getOwnerComponent().getModel().resetChanges(targets);
		},

		cancelAllPendingChanges: function () {
			const messageManager = sap.ui.getCore().getMessageManager();
			messageManager.removeMessages();
			const msgSectionKeys = Object.keys(this.getModel("messages").getData());
			for (let key in msgSectionKeys) {
				this.getModel("messages").setProperty(`/${msgSectionKeys[key]}`, []);
			}
			this.getOwnerComponent().getModel().resetChanges();
		},
		/**
		 * This method returns the error messages from the MessageManager for a given entity
		 * @returns Array<Object<Message>>
		 */
		getMessages: function (entities) {
			return this.getModel("message").getData().filter(el => {
				let entityIndex = entities.findIndex(entity => el.target.toLowerCase().includes(entity.toLowerCase()));
				if(entityIndex > -1) return el; 
			});
		},

		/**
		 * This method returns the targets from the MessageMaager message for a given entity
		 * @returns Array<String> - Targets
		 */
		getTargets: function (entities) {
			const pendingChanges = this.getModel().getPendingChanges();
			return Object.keys(pendingChanges).filter(el => {
				const entityIndex = entities.findIndex(entity => el.toLowerCase().includes(entity.toLowerCase()));
				if (entityIndex > -1) return el; 
			}).map(e=>"/" + e);
		},
		setMessageSection: function (entities, sectionName) {
			const messages = this.getMessages(entities);
			this.getModel("messages").setProperty(`/${sectionName}`, messages);
		}
	});

});