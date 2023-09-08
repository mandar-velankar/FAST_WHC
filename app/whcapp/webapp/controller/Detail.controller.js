sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/Token",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"../model/formatter"
], function (BaseController, JSONModel, Token, Fragment,MessageToast, MessageBox, Filter, FilterOperator, Sorter, formatter) {
	"use strict";

	return BaseController.extend("com.bayer.tender.whcapp.controller.Detail", {
		views:{},
		formatter: formatter,

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
			this.oDynamicPage = this.byId("detailPage");

			let oMultiInput1 = this.byId("multiInputMemberBHO");
			oMultiInput1.setTokens([
				new Token({ text: "Contract customer 11", key: "Contract customer 11" }),
				new Token({ text: "Contract customer 12", key: "Contract customer 12" })
			]);

			let oMultiInput2 = this.byId("multiInput2");
			oMultiInput2.setTokens([
				new Token({ text: "Contract customer 11", key: "Contract customer 11" }),
				new Token({ text: "Contract customer 12", key: "Contract customer 12" })
			]);
		},
		_onObjectMatched: async function (oEvent) {
			this.id = oEvent.getParameter("arguments").id;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

			this.getModel().metadataLoaded().then(()=>{
				this._bindView()
				this.filterDiscountsTable();
				this.bindRebatesTable();
			});
		},
		_bindView: async function () {
			const path = this.getModel().createKey("/Contracts", {
				ID: this.id
			});

			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);
			this.getModel("appView").setProperty("/editmode", false);

			this.getView().bindElement({
				path: path,
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

		filterDiscountsTable: async function () {
			const discountTable = this.byId("discountsTable");
			const template = discountTable.getBindingInfo("items").template;
			const contract = await this.getContractById();
			const filter = [
				new Filter("Contracts_ID", FilterOperator.EQ, this.id),
				new Filter("Year", FilterOperator.LE, contract?.ProposedContractLength),
			]

			discountTable.getBinding("items").filter(filter);
		},

		bindRebatesTable: async function () {
			const rebatesTable = this.byId("rebatesTable");
			const contract = await this.getContractById();

			rebatesTable.bindRows({
				path: "/Rebates",
				filters: [
					new Filter("Contracts_ID", "EQ", this.id),
					new Filter("Year", "LE", contract?.ProposedContractLength),
				],
				sorter: [ 
					new Sorter({
						path: "Year",
						descending: false
					})
				],
			});

		},

		getContractById: function () {
			return new Promise((resolve, reject) => {
				this.getModel().read("/Contracts", {
					filters: [
						new Filter("ID", "EQ", this.id)
					],
					success: function (res) {
						resolve(res?.results[0]);
					},
					error: function (error) {
						reject(error);
					}
				})
			});
		},

		onEdit: function () {
			const editmode = this.getModel("appView").getProperty("/editmode");
			this.getModel("appView").setProperty("/editmode", !editmode);
			this.oDynamicPage.setShowFooter(true);
		},
		onFooterCancelPress: function () {
			const editmode = this.getModel("appView").getProperty("/editmode");
			this.getModel("appView").setProperty("/editmode", !editmode);
			this.oDynamicPage.setShowFooter(false);
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
		},
		onAddMainCustomerButtonPress: function (event) {
			const searchWidgetEl = document.getElementById("searchWidget");
			searchWidgetEl.start();
			searchWidgetEl.addEventListener(`veeva-network:CT_SEARCH:select`, (ev) => {
				const entity = ev.detail.entity;
				MessageToast.show(`ID of selected customer: ${entity.entityId} - ${entity.entity.whc_legal_name__c}`);//or corporate_name__v instead of whc_legal...
				searchWidgetEl.close();
			}, { once: true });

		},
		onShowWacButtonPress: async function () {
			let that = this;

			if (!this.byId("idProductWacPopup")) {
				this.approvalsDialog = await Fragment.load({
					id: that.getView().getId(),
					name: "com.bayer.tender.whcapp.view.fragments.WACPopup",
					controller: that,
				}).then(function (oDialog) {
					oDialog.setResizable(false);
					oDialog.setStretch(false);
					that.getView().addDependent(oDialog);
					oDialog.open();
				});
			} else {
				this.byId("idProductWacPopup").open();
			}
		},

		onCloseWACPopup: function () {
			this.byId("idProductWacPopup").close();
		},

		onBaseLineUnitChange: function (oEvent) {
			let input = oEvent.getSource(),
				value = oEvent.getSource()?.getValue();
			if (isNaN(value)) {
				input.setValue(value.substring(0, value.length - 2));
			}

			if (value.indexOf('.') != -1) {
				input.setValue(value.substring(0, value.length - 2));
			}
		},

		onProposedContractLengthChange: function (event) {
			let input = event.getSource(),
			value = input?.getValue();

			if (value > 6) {
				input.setValueState("Error");
                input.setValueStateText("Proposed Contract Length should not be greater than 6 years");
                input.openValueStateMessage();
			}else {
				input.setValueState("None");
                input.setValueStateText("");
                input.closeValueStateMessage();
			}
		},

		onAfterItemAdded:async function(event){
			const uploader = this.byId("UploadSet");
			const item = event.getParameter("item")
			const id = await this.createAttachmentEntry(this.id,item);
			item.setUploadUrl(`/catalog/Attachments(${id})/Content`);
			uploader.uploadItem(item);
		},
		onUploadCompleted: function (event) {
			const uploader = this.byId("UploadSet");
			uploader.removeAllIncompleteItems();
			uploader.getBinding("items").refresh();
		},
		onAttachmentDelete: function (event) {
			const deleteItem = event.getParameter("item").getBindingContext();
			const attaPath = this.getModel().createKey("/Attachments", deleteItem.getObject());
	
			MessageBox.warning("Are you sure?", {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: (action) => {
					if (action === MessageBox.Action.OK) {
						this.getModel().remove(attaPath);
					}
				}
			});
	
			event.preventDefault();
		},
		createAttachmentEntry: async function (id, file) {
			return new Promise((resolve, reject) => {
				this.getModel().create("/Attachments", {
					Contract_ID: id,
					FileName: file.getFileName()
				}, {
					success: (response) => {
						resolve(response.ID);
					}
				});

			})
		},
		submitChanges: function () {
			return new Promise((resolve, reject) => {
				this.getModel().submitChanges({
					success: () => resolve(),
					error: () => reject()
				});
			})
		},
		onSave: async function () {
			try {
				await this.submitChanges();
				
				MessageBox.success("Contract created: " + this.getView().getBindingContext().getProperty("ID"));
				this.getModel().refresh();
			} catch (error) {
				console.error(error);
			}
			// (this.getModel() as ODataModel).changeHttpHeaders({captcha:""});
			// const id = this.getView().getBindingContext().getProperty("ID");
			// if (id) {
			// 	const uploader = this.byId("UploadSet");
			// 	const files = uploader.getIncompleteItems().length;
			// 	Promise.all(uploader.getIncompleteItems().map((item) => this.createAttachmentEntry(id, item))).then(() => {
			// 		uploader.upload();
			// 		this.id = id;
			// 	});
			// 	await this.submitChanges();
			// 	if (files === 0) {
			// 		MessageBox.success("Contract created: " + id);
			// 	}
			// }

		},

		onMenuAction: function (event) {
			let selectedItem = event.getParameter("item");
			let selectedText = selectedItem.getText();
		  
			// Update the "Status" Text element's text property based on the selected menu item
			let statusText = this.getView().byId("idStatus");
			statusText.setText(selectedText);
		},

		onFormatDiscountTableValues: function (event) {
			const discountTable = this.byId("discountsTable");
			const items = discountTable.getItems();
			const selectedType = event.getParameter("selectedItem").getProperty("text");

			switch (selectedType) {
				case "Value":
					items.map(item => {
						const obj = item.getBindingContext().getObject();
						const path = item.getBindingContext().getPath();
						const parsedValue = formatter.parsePercentage(obj.WAC);
						this.getModel().setProperty(`${path}/WAC`, (parsedValue * 100));
					})
					break;
				case "Percentage":
					items.map(item => {
						const obj = item.getBindingContext().getObject();
						const path = item.getBindingContext().getPath();
						const formattedValue = formatter.formatPercentage(obj.WAC / 100);
						this.getModel().setProperty(`${path}/WAC`, formattedValue);
					})
					break;
				default:
					break;
			}
		},

		onPrintButtonPress: function(event){
			const doc = new jspdf.jsPDF();

			doc.text("Hello world!", 10, 10);
			doc.save("a4.pdf");
		}
	});

});