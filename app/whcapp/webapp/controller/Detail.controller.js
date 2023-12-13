sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/Token",
	"sap/ui/core/Fragment",
	"sap/ui/core/Item",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"../model/formatter",
	"sap/m/Dialog",
	"sap/m/MultiInput",
	"sap/m/Button",
], function (BaseController, JSONModel, Token, Fragment, Item, MessageToast, MessageBox, Filter, FilterOperator, Sorter, formatter, Dialog, MultiInput, Button) {
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
		},
		_onObjectMatched: async function (oEvent) {
			this.id = oEvent.getParameter("arguments").id;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.masterTable = oEvent.getParameter("view").byId('masterTable');

				
			this.getModel().metadataLoaded().then( async ()=>{
				this.filterMasterTable(this.masterTable, this.id);
				const selectedDiscountType = await this.getSavedDiscountType(this.id);
				this.getModel("detailView").setProperty("/selectedDiscountType", selectedDiscountType)
				await this.loadDiscountFragment(selectedDiscountType);
				this._bindView()
				this.filterDiscountsTable();
				this.bindRebatesTable();
				this.bindAllContractMembers();
				this.bindAttachments();
			});
		},

		filterMasterTable: function(table, contractID){
			table.getModel("masterView").setProperty("/showHighlight", true);
			const binding = table.getBinding("items");
			this.previousMasterTableApplicationFilters = binding.aApplicationFilters;
			binding.aApplicationFilters = [];
			const filters = [
				new Filter({
                    path: "ID",
                    operator: FilterOperator.EQ,
                    value1: contractID.split("-").splice(0,5).join("-"),
                    caseSensitive: false
                })
			];
			const sorter = new Sorter({
				path: "modifiedAt",
				descending: true
			});
			binding.filter(filters).sort(sorter);
		},

		_bindView: async function () {
			const path = this.getModel().createKey("/ContractsView", {
				ContractsViewID: this.id
			});

			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);
			this.getModel("appView").setProperty("/editmode", false);

			this.getView().bindElement({
				path: path,
				// parameters: {
				// 	expand: "ContractCustomers"
				// },
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

		onDeleteContractPress(event){
			const that = this;

			MessageBox.warning("Are you sure you want to delete this contract?", {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: async function(action) {
					if (action === MessageBox.Action.OK) {
						const deleteStatusID = await that.getStatusID('Deleted');
						const context = that.getView().getBindingContext();
						that.getView().getModel().setProperty("StatusID",deleteStatusID,context);
						that.getView().getModel().setProperty("Status",'Deleted',context);

						return new Promise((resolve, reject) => {
							that.getModel().submitChanges({
								success: that.deleteSuccess.bind(that),
								error: that.contractSavedError.bind(that)
							});
						});
					}
				}
			});
		},

		deleteSuccess: function(event){
			this.onCloseDetailPress();
			this.getModel().resetChanges();
			this.getModel().refresh();
		},

		filterDiscountsTable: async function (proposedContractLength) {
			const discountTable = this.byId("discountsTable");
			const contract = await this.getContractById();
			const year = proposedContractLength || contract?.ProposedContractLength;
			const filter = [
				new Filter("ContractID", FilterOperator.EQ, contract?.ID),
				new Filter("Year", FilterOperator.LE, year),
				new Filter("isCurrent", FilterOperator.EQ, contract?.isCurrent),
				new Filter("ContractsViewID", FilterOperator.EQ, this.id)
			]

			discountTable.getBinding("items").filter(filter);
		},

		bindRebatesTable: async function (proposedContractLength) {
			const rebatesTable = this.byId("rebatesTable");
			const contract = await this.getContractById();
			const year = proposedContractLength || contract?.ProposedContractLength;
			let oneSecondLaterValidFromDate = new Date(contract?.ValidFrom);
			oneSecondLaterValidFromDate.setSeconds(oneSecondLaterValidFromDate.getSeconds() + 1);

			const filters = [
				new Filter("ContractsViewID", "EQ", contract?.ContractsViewID),
				new Filter("Year", "LE", year)
			];

			// for history data we need additional filter
			if(!contract.isCurrent){
				const oFilterStartDate = new Filter("ValidFrom", FilterOperator.GE, contract?.ValidFrom);
				const oFilterEndDate = new Filter("ValidFrom", FilterOperator.LE, oneSecondLaterValidFromDate);
				filters.push(new Filter({
					filters: [oFilterStartDate, oFilterEndDate],
					and: true
				}));
			}

			rebatesTable.bindRows({
				path: "/RebatesView",
				filters: filters,
				sorter: [ 
					new Sorter({
						path: "Year",
						descending: false
					})
				],
				events: {
					dataRequested: function () {
						
					},
					dataReceived: this.rebatesDataReceived.bind(this)
				}
			});
		},
		rebatesDataReceived: function (event) {
			const rebatesTable = this.byId("rebatesTable");
			const rebates = event.getParameter("data")?.results;
			if (rebates.length > 0) rebatesTable.setVisibleRowCount(rebates.length);
		},

		getContractById: function () {
			return new Promise((resolve, reject) => {
				this.getModel().read("/ContractsView", {
					filters: [
						new Filter("ContractsViewID", "EQ", this.id)
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

		bindAllContractMembers: async function(){
			await this.bindContractParentMembers();
			await this.bindContractMembers();
		},

		bindContractParentMembers: async function (){
			let oMembersTable = this.byId('mainCustomersTable');
			const contract = await this.getContractById();
			let oneSecondLaterValidFromDate = new Date(contract?.ValidFrom);
			oneSecondLaterValidFromDate.setSeconds(oneSecondLaterValidFromDate.getSeconds() + 1);

			const filters = [
				new Filter("ContractsViewID", "EQ", contract?.ContractsViewID),
				new Filter("IsParent", "EQ", true)
			];

			// for history data we need additional filter
			if(!contract.isCurrent){
				const oFilterStartDate = new Filter("ValidFrom", FilterOperator.GE, contract?.ValidFrom);
				const oFilterEndDate = new Filter("ValidFrom", FilterOperator.LE, oneSecondLaterValidFromDate);
				filters.push(new Filter({
					filters: [oFilterStartDate, oFilterEndDate],
					and: true
				}));
			}

			//bind table data
			const membersTableTemplate = oMembersTable.getBindingInfo("items").template;
			oMembersTable.bindItems({
				path: "/ContractCustomersView",
				filters: filters,
				template: membersTableTemplate
			});
		},

		onMainCustomersBindingFinished: async function (event){
			this.getView().byId("btnAddBHOParent")?.setVisible(!this.getView().byId('mainCustomersTable').getBinding('items').getLength() > 0 && this.getModel("appView").getProperty("/editmode"));
			this.getView().byId("btnManualBHOParent")?.setVisible(!this.getView().byId('mainCustomersTable').getBinding('items').getLength() > 0 && this.getModel("appView").getProperty("/editmode"));
			this.onBindTableauSrcURL();
		},

		bindContractMembers: async function (){
			let oMembersTable = this.byId('customersTable');
			const contract = await this.getContractById();
			let oneSecondLaterValidFromDate = new Date(contract?.ValidFrom);
			oneSecondLaterValidFromDate.setSeconds(oneSecondLaterValidFromDate.getSeconds() + 1);

			const filters = [
				new Filter("ContractsViewID", "EQ", contract?.ContractsViewID),
				new Filter("IsParent", "EQ", false)
			];

			// for history data we need additional filter
			if(!contract.isCurrent){
				const oFilterStartDate = new Filter("ValidFrom", FilterOperator.GE, contract?.ValidFrom);
				const oFilterEndDate = new Filter("ValidFrom", FilterOperator.LE, oneSecondLaterValidFromDate);
				filters.push(new Filter({
					filters: [oFilterStartDate, oFilterEndDate],
					and: true
				}));
			}

			//bind table data
			const membersTableTemplate = oMembersTable.getBindingInfo("items").template;
			oMembersTable.bindItems({
				path: "/ContractCustomersView",
				filters: filters,
				template: membersTableTemplate
			});
		},

		onDeleteBHO: async function (event){
			this.getOwnerComponent().getModel().remove(`/ContractCustomersView('${this.getOwnerComponent().getModel().getProperty(event.getSource().getParent().getBindingContextPath()).ID}')`);
		},

		onAddNonVeevaBHO: async function (event){
			const that = this;
			const isParent = event.getSource().getId()?.includes('Parent');

			let dialog = new Dialog({
				title: "Create",
				type: "Message",
				content: [
					new MultiInput({
						showValueHelp: false,
						showSuggestion: false
					}),
				],
				beginButton: new Button({
							text: "Save",
							press: function () {
								dialog.close();
							}.bind(this)
				}),
				endButton: new Button({
							text: "Cancel",
							press: function () {
								dialog.close();
							}
				}),
				afterClose: async function (event) {
					if(event.getParameters().origin.getText() === 'Save'){
						//save tokens as ContractMembers
						await that.saveManuallyAddedCustomerTokens(isParent, dialog);
					}
					dialog.destroy();
				}
			});

			var bhoInputValidator = function(args){
				var text = args.text;

				return new Token({key: text, text: text});
			};
			dialog.open();
			dialog.getContent()[0]?.addValidator(bhoInputValidator);
		},

		saveManuallyAddedCustomerTokens: async function(isParent, dialog){
			let contract = await this.getContractById(this.id);
			let bhoInputfield = dialog.getContent()[0];
			if(bhoInputfield){
				let tokens = bhoInputfield.getTokens();
				tokens.forEach(token => {
					let newCustomerObject = {
						"BHOID": token.getProperty('text'),
						"ContractID": contract.ID,
						"IsParent": isParent
					}
	
					this.getOwnerComponent().getModel().createEntry("/ContractCustomersView", {
						properties: newCustomerObject
					});
	
				});

				if(tokens?.length > 0){
					return new Promise((resolve, reject) => {
						this.getModel().submitChanges({
							error: this.contractSavedError.bind(this)
						});
					})
				}
			}
		},

		getContractCustomersById: function(contract){
			return new Promise((resolve, reject) => {
				this.getModel().read("/ContractCustomersView", {
					filters: [
						new Filter("ContractID", "EQ", contract.ID)
					],
					success: function (res) {
						resolve(res?.results);
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
			this.onMainCustomersBindingFinished();
			this.oDynamicPage.setShowFooter(true);
		},
		onFooterCancelPress: async function () {
			const savedDiscountType = await this.getSavedDiscountType(this.id);
			this.getModel("detailView").setProperty("/selectedDiscountType", savedDiscountType);
			await this.loadDiscountFragment(savedDiscountType);
			this.getModel().resetChanges();
			this.filterDiscountsTable();
			this.bindRebatesTable();
			const editmode = this.getModel("appView").getProperty("/editmode");
			this.getModel("appView").setProperty("/editmode", !editmode);
			this.oDynamicPage.setShowFooter(false);
		},
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			this.getView().unbindElement();
			this.masterTable.getBinding("items").aApplicationFilters = this.previousMasterTableApplicationFilters;
			this.masterTable.getModel("masterView").setProperty("/showHighlight", false);
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
		onAddMainCustomerButtonPress: async function (event) {
			const searchWidgetEl = document.getElementById("searchWidget");
			let contract = await this.getContractById(this.id);
			searchWidgetEl.start();
			searchWidgetEl.addEventListener(`veeva-network:CT_SEARCH:select`, (ev) => {
				const entity = ev.detail.entity;

				let newCustomerObject = {
					"BHOID": entity.entity.Bayer_ID__c,
					"Name": entity.entity.whc_legal_name__c,
					"ContractID": contract.ID,
					"IsParent": true
				}

				this.getOwnerComponent().getModel().createEntry("/ContractCustomersView", {
					properties: newCustomerObject
				});

				searchWidgetEl.close();

				return new Promise((resolve, reject) => {
					this.getModel().submitChanges({
						error: this.contractSavedError.bind(this)
					});
				})

			}, { once: true });

		},

		onAddCustomerButtonPress: async function (event) {
			const searchWidgetEl = document.getElementById("searchWidget");
			let contract = await this.getContractById(this.id);
			searchWidgetEl.start();
			searchWidgetEl.addEventListener(`veeva-network:CT_SEARCH:select`, (ev) => {
				const entity = ev.detail.entity;

				let newCustomerObject = {
					"BHOID": entity.entity.Bayer_ID__c,
					"Name": entity.entity.whc_legal_name__c,
					"ContractID": contract.ID,
					"IsParent": false
				}

				this.getOwnerComponent().getModel().createEntry("/ContractCustomersView", {
					properties: newCustomerObject
				});

				searchWidgetEl.close();

				return new Promise((resolve, reject) => {
					this.getModel().submitChanges({
						error: this.contractSavedError.bind(this)
					});
				})
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
			if (!value) {
				this.filterDiscountsTable(value);
				this.bindRebatesTable(value);
				return;
			}
			if (value < 1 || value > 6) {
				input.setValueState("Error");
                input.setValueStateText("Proposed Contract Length should not be greater than 6 years");
                input.openValueStateMessage();
				this.filterDiscountsTable("");
				this.bindRebatesTable("");
			}else {
				input.setValueState("None");
                input.setValueStateText("");
                input.closeValueStateMessage();
				this.filterDiscountsTable(value);
				this.bindRebatesTable(value);
			}
		},

		bindAttachments: async function(event){
			const contract = await this.getContract(this.id);
			const uploader = this.byId("UploadSet");
			await uploader.getBinding('items')?.filter(new Filter('Contract_ID', 'EQ', contract.ID));
		},

		onAfterItemAdded:async function(event){
			const uploader = this.byId("UploadSet");
			const item = event.getParameter("item");
			const contract = await this.getContract(this.id);
			const id = await this.createAttachmentEntry(contract.ID,item);

			if(window.location.host.search('port4004') === -1){
				uploader.removeHeaderField("X-CSRF-Token");
				uploader.insertHeaderField(new Item({key: "X-CSRF-Token", text: this.getOwnerComponent().getModel().getSecurityToken()}));
			}
			item.setUploadUrl(//window.location.host.search('/app') > -1 ? `/app/whc/v2/catalog/Attachments(ID=${id})/Content` : 
							  window.location.host.search('port4004') > -1 ? `/v2/catalog/Attachments(ID=${id})/Content` :
							  `/app/whc/v2/catalog/Attachments(ID=${id})/Content`);
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

		onAttachmentDownload: function (event) {
			const downloadItem = event.getParameter("item");
			const uploader = this.byId("UploadSet");
			let item = uploader.getItems()?.find(item => item === downloadItem);

			item?.setUrl(//window.location.host.search('/app') > -1 ? `/app/whc/v2/catalog/Attachments(guid'${item.getBindingContext().getProperty('ID')}')/Content` : 
						 window.location.host.search('port4004') > -1 ? `/v2/catalog/Attachments(guid'${item.getBindingContext().getProperty('ID')}')/Content` :
						 `/app/whc/v2/catalog/Attachments(guid'${item.getBindingContext().getProperty('ID')}')/Content`)

			downloadItem.download();
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
					success: this.contractSavedSuccess.bind(this),
					error: this.contractSavedError.bind(this)
				});
			})
		},

		

		onSave: async function () {
			try {
				const draftStatusID = await this.getStatusID('Draft');
				//let contract = await this.getContractById(this.id);
				const context = this.getView().getBindingContext();
				this.getView().getModel().setProperty("StatusID",draftStatusID,context);
				this.calculateDiscountProductsPercentage();
				// if(!(contract.Type === 'New Proposal')){
				// 	this.mapBHOIdsPendingChanges(contract);
				// }
				await this.submitChanges();
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
		contractSavedSuccess: function (event) {
			const hasErrorMessages = this.oMessageManager.getMessageModel().getData();
			if (hasErrorMessages.length < 1) {
				MessageBox.success("Contract updated successfully");
				this.getModel("appView").setProperty("/editmode", false);
				this.oDynamicPage.setShowFooter(false);
				this.filterDiscountsTable();
				this.bindRebatesTable();
				this.onBindTableauSrcURL();
				//this.bindAllContractMembers();
				this.getModel().resetChanges();
				this.getModel().refresh();
			}
			this.getModel("detailView").setProperty("/busy", false);

			
		},

		contractSavedError: function (error) {

		},

		onBindTableauSrcURL: function () {
			let tableau = this.byId("idTableauChart");
			let contract = this.getOwnerComponent().getModel().getProperty(`/ContractsView('${this.id}')`);
			if(contract.Type){
				if(contract.Type === 'New Proposal'){
					//get parent bho (there's only one)
					let parentBHO = this.getView().byId('mainCustomersTable').getItems()[0]?.getBindingContext()?.getObject();
					if(parentBHO)
						tableau.setSrc(`https://tableau-ncsa.aws.cnb/t/CPROD/views/WHCContractProposal/ContractProposal?ORIGINAL_ORDERING_ACCOUNT_NUM=${parentBHO.BHOID}&amp;:embed=y&amp;:showVizHome=n&amp;:tabs=n&amp;:toolbar=n&amp;:apiID=host1#navType=0&amp;navSrc=Parse%22`);
				} else {
					tableau.setSrc(`https://tableau-ncsa.aws.cnb/t/CPROD/views/WHCContractRenewalV1/WHCContractRenewal?Vistex%20ID=${contract.VistexID}&amp;:embed=y&amp;:showVizHome=n&amp;:tabs=n&amp;:toolbar=n&amp;:apiID=host20#navType=0&amp;navSrc=Parse`)
				}
			}
		},

		onMenuAction: async function (event) {
			let selectedItem = event.getParameter("item");
			let selectedText = selectedItem.getText();
		  
			// Update the "Status" Text element's text property based on the selected menu item
			let statusText = this.getView().byId("idStatus");
			let statusButton = this.getView().byId("idButtonAction");


			switch (selectedText) {
				case "Save Draft":
					statusText.setText("Draft");
				  	break;
				case "Submit to Workshop":
					statusText.setText("In Workshop");
				  	break;
				case "Approve":
					statusText.setText("Approved");
				  	break;
				case "Reject":
					statusText.setText("Rejected");
				  	break;
				case "Cancel Proposal":
					statusText.setText("Cancelled");
				  	break;
				case "Archive":
					statusText.setText("Archived");
				  	break;
				default:
				  	break;
			}

			const draftStatusID = await this.getStatusID(statusText.getText());
			const context = this.getView().getBindingContext();
			this.getView().getModel().setProperty("StatusID",draftStatusID,context);
			this.getView().getModel().setProperty("Status",statusText.getText(),context);
			statusButton.setText('Set Status');

			return new Promise((resolve, reject) => {
				this.getModel().submitChanges({
					error: this.contractSavedError.bind(this)
				});
			});
		},

		onFormatDiscountTableValues: async function (event) {
			const contract = this.getView().getBindingContext().getObject();
			const discountTable = this.byId("discountsTable");
			const items = discountTable.getItems();
			const selectedType = event?.getParameter("selectedItem")?.getProperty("text") || this.getModel("detailView").getProperty("/selectedDiscountType");
			this.getModel("detailView").setProperty("/selectedDiscountType", selectedType);
			switch (selectedType) {
				case "Value":
					await this.loadDiscountFragment("Value");
					this.filterDiscountsTable(contract?.ProposedContractLength);
					items.map(item => {
						const context = item.getBindingContext();
						const obj = context.getObject();
						const Mirena = parseInt(obj.Mirena * 100);
						const Kyleena = parseInt(obj.Kyleena * 100);
						const Skyla = parseInt(obj.Skyla * 100);

						this.getModel().setProperty('Mirena', !Mirena ? "" : Mirena, context);
						this.getModel().setProperty('Kyleena', !Kyleena ? "" : Kyleena, context);
						this.getModel().setProperty('Skyla', !Skyla ? "" : Skyla, context);
					});
					break;
				case "Percentage":
					await this.loadDiscountFragment("Percentage");
					this.filterDiscountsTable(contract?.ProposedContractLength);
					items.map(item => {
						const context = item.getBindingContext();
						const obj = context.getObject();

						this.getModel().setProperty('Mirena', obj.Mirena / 100, context);
						this.getModel().setProperty('Kyleena', obj.Kyleena / 100, context);
						this.getModel().setProperty('Skyla', obj.Skyla / 100, context);
					});
					break;
				default:
					break;
			}
		},

		onPrintButtonPress: function(event){
			// this.savePDF();	
			this.printTriggered();
		},

		printTriggered: async function(){
			// Get DATA
			let image;
			const contract = await this.getContract(this.id);
			const fileName = `proposal-${contract.Name.replace(/ /g, '-')}-${new Date().toJSON()}.pdf`;
			const discounts = await this.getDiscounts(contract);
			const discountItems = discounts.results.map(item => {
				const isDiscountTypePercentage = item.SelectedDiscountType === "Percentage";
				const mirena = isDiscountTypePercentage ? (item.Mirena === "null" ? 0+"%" : (item.Mirena*100).toFixed(1)+"%") : item.Mirena; 
				const kyleeena = isDiscountTypePercentage ? (item.Kyleena === "null" ? 0+"%" : (item.Kyleena*100).toFixed(1)+"%") : item.Kyleena; 
				const skyla = isDiscountTypePercentage ? (item.Skyla === "null" ? 0+"%" : (item.Skyla*100).toFixed(1)+"%") : item.Skyla; 
				return ["Y"+item.Year, item.Units, mirena, kyleeena, skyla]
			});
			const rebates = await this.getRebates(contract);
			const sortedRebates = rebates.results.sort((a, b) => {
				if (a.Year < b.Year) {
					return -1;
				}
				if (a.Year > b.Year) {
					return 1;
				}
				return 0;
			});
			const rebateItems = sortedRebates.map(item => ["Y"+item.Year, item.RebateLevels_Unit_Level_1, (item.RebateLevels_Discount_Level_1*100).toFixed(1)+"%", item.RebateLevels_Unit_Level_2, (item.RebateLevels_Discount_Level_2*100).toFixed(1)+"%", item.RebateLevels_Unit_Level_3, (item.RebateLevels_Discount_Level_3*100).toFixed(1)+"%"]);
			const mainCustomersTable = this.byId("mainCustomersTable");
			const mainCustomersTableItemNames = mainCustomersTable.getItems().map(item => [item.getBindingContext().getObject().BHOID]);
			const customersTable = this.byId("customersTable");
			const customersTableItemNames = customersTable.getItems().map(item => [item.getBindingContext().getObject().BHOID]);
			const whcProducts = await this.getWHCProducts();
			const wacItems = whcProducts.results.map(item => [item.ProductName, item.WAC]);
			// Define CSS styles for the printed page
			const printStyles = `
				<style>
					table {
						border-collapse: collapse;
						border: 1px solid black;
						width: 100%;
					}
					th, td {
						border: 1px solid black;
						text-align: center;
						font-size: x-small;
					}
					h3 { 
						background-color: #0091DF;  
						color: white;
						font-size: small;
					}
					th {
						background-color: #D30F4B;
						color: white;
						font-size: x-small;
					}
					.page-break-before { 
						page-break-before: always;
					} 
					.page-break-after {
						page-break-after: always;
					}
					* {
						-webkit-print-color-adjust: exact !important;   /* Chrome, Safari 6 – 15.3, Edge */
						color-adjust: exact !important;                 /* Firefox 48 – 96 */
						print-color-adjust: exact !important;           /* Firefox 97+, Safari 15.4+ */
					}
				</style>
			`;
			let header = "<center><h1 style='font-size: medium;'>"+ `Proposal ${contract.Name}`+ "</h1></center><hr>"
			let genInfoSec = "<h3 style='text-align: left;'>General Information</h3>";
			let proposalInfo = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' ><tr><th style='border: 1px solid black;'>Proposal Name</th><th style='border: 1px solid black;'>Proposal Type</th><th style='border: 1px solid black;'>Vistext ID</th></tr>";
			proposalInfo +="<tr><td style='border: 1px solid black; text-align: center;'>"+contract.Name+"</td><td style='border: 1px solid black; text-align: center;'>"+contract.Type+"</td><td style='border: 1px solid black; text-align: center;'>"+(contract.VistexID !== null ? contract.VistexID : '')+"</td>";
			proposalInfo += "</tr></table><br>";
			let parentBho = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' ><tr><th style='border: 1px solid black;'>Parent BHO IDs</th></tr>";
			for(const mainCustomersTableItemName of mainCustomersTableItemNames){
				parentBho +="<tr><td style='border: 1px solid black; text-align: center;'>"+mainCustomersTableItemName+"</td></tr>";
			}
			parentBho += "</table><br>";
			/*let memberBho = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' ><tr><th style='border: 1px solid black;'>Member BHO IDs</th></tr>";
			for(const customersTableItemName of customersTableItemNames){
				memberBho +="<tr><td style='border: 1px solid black; text-align: center;'>"+customersTableItemName+"</td></tr>";
			}
			memberBho += "</table><br>";
			let wacInfo = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' ><tr><th style='border: 1px solid black;'>Product Name</th><th style='border: 1px solid black;'>WAC</th></tr>";
			for (const wacItem of wacItems) {
				wacInfo +="<tr><td style='border: 1px solid black; text-align: center;'>"+wacItem[0]+"</td><td style='border: 1px solid black; text-align: center;'>"+wacItem[1]+"</td></tr>";
			}
			wacInfo += "</table><br>";*/
			let backInfoSec = "<h3 style='text-align: left;'>Baseline & Background Information</h3>";
			let baselineInfo = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' ><tr><th style='border: 1px solid black;'>Baseline unit</th><th style='border: 1px solid black;'>Baseline Discount</th><th style='border: 1px solid black;'>Proposed Contract Length</th></tr>";
			baselineInfo +="<tr><td style='border: 1px solid black; text-align: center;'>"+(contract.BaseLineUnits !==null ? contract.BaseLineUnits : '')+"</td><td style='border: 1px solid black; text-align: center;'>"+`${(contract.BaseLineDiscount*100).toFixed(1)}%`+"</td><td style='border: 1px solid black; text-align: center;'>"+(contract.ProposedContractLength !== null ? contract.ProposedContractLength : '')+"</td>";
			baselineInfo += "</tr></table><br>";
			let backgroundInfo = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' ><tr><th style='border: 1px solid black;'>Background Information</th></tr>";
			backgroundInfo +="<tr><td style='border: 1px solid black; text-align: center;'>"+(contract.BackgroundInfo !== null ? contract.BackgroundInfo : '')+"</td></tr></table><br>";
			let discountSec = "<h3 style='text-align: left;'>Discount</h3>";
			let discountInfo = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' ><tr><th style='border: 1px solid black;'>Year</th><th style='border: 1px solid black;'>Units</th><th style='border: 1px solid black;'>Mirena</th><th style='border: 1px solid black;'>Kyleena</th><th style='border: 1px solid black;'>Skyla</th></tr>";
			for(const discountItem of discountItems){
				discountInfo +="<tr><td style='border: 1px solid black; text-align: center;'>"+discountItem[0]+"</td><td style='border: 1px solid black; text-align: center;'>"+(discountItem[1] !== null ? discountItem[1] : '')+"</td><td style='border: 1px solid black; text-align: center;'>"+discountItem[2]+"</td><td style='border: 1px solid black; text-align: center;'>"+discountItem[3]+"</td><td style='border: 1px solid black; text-align: center;'>"+discountItem[4]+"</td>";
			}
			discountInfo += "</tr></table><br>";
			let rebateSec = "<h3 style='text-align: left;'>Rebate</h3>";
			let rebateInfo = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' >"
			rebateInfo += "<tr><th style='border: 1px solid black;' rowspan='2'>Year</th><th style='border: 1px solid black;' colspan='2'>L1</th><th style='border: 1px solid black;' colspan='2'>L2</th><th style='border: 1px solid black;' colspan='2'>L3</th></tr>";
			rebateInfo += "<tr><th style='border: 1px solid black;'>Unit</th><th style='border: 1px solid black;'>Discount</th><th style='border: 1px solid black;'>Unit</th><th style='border: 1px solid black;'>Discount</th><th style='border: 1px solid black;'>Unit</th><th style='border: 1px solid black;'>Discount</th></tr>";
			for(const rebateItem of rebateItems){
				rebateInfo +="<tr><td style='border: 1px solid black; text-align: center;'>"+rebateItem[0]+"</td><td style='border: 1px solid black; text-align: center;'>"+(rebateItem[1] !== null ? rebateItem[1] : '')+"</td><td style='border: 1px solid black; text-align: center;'>"+rebateItem[2]+"</td><td style='border: 1px solid black; text-align: center;'>"+(rebateItem[3] !== null ? rebateItem[3] : '')+"</td><td style='border: 1px solid black; text-align: center;'>"+rebateItem[4]+"</td><td style='border: 1px solid black; text-align: center;'>"+(rebateItem[5] !== null ? rebateItem[5] : '')+"</td><td style='border: 1px solid black; text-align: center;'>"+rebateItem[6]+"</td>";
			}
			rebateInfo += "</tr></table><br>";
			let remarkSec = "<h3 style='text-align: left;'>Remarks</h3>";
			let remarkTable = "<table style='border-collapse: collapse;border: 1px solid black;' width='100%' ><tr><th style='border: 1px solid black;'>Remarks</th></tr>";
			remarkTable +="<tr><td style='border: 1px solid black; text-align: center;'>"+(contract.Remarks  !== null ? contract.Remarks : '')+"</td></tr></table><br>"; 
			let tableauSec = "<h3 style='text-align: left;'>Tableau</h3>";
			if(contract.Type){
				if(contract.Type === 'New Proposal'){
					image = "<img src="+`https://tableau-ncsa.aws.cnb/t/CPROD/views/WHCContractProposal/ContractProposal.png?ORIGINAL_ORDERING_ACCOUNT_NUM=${mainCustomersTableItemNames[0]}&amp;:embed=y&amp;:showVizHome=n&amp;:tabs=n&amp;:toolbar=n&amp;:apiID=host1#navType=0&amp;navSrc=Parse%22`+" width='60%' height='60%'></img>";
				}
				else{
					image = "<img src="+`https://tableau-ncsa.aws.cnb/t/CPROD/views/WHCContractRenewalV1/WHCContractRenewal.png?Vistex%20ID=${contract.VistexID}&amp;:embed=y&amp;:showVizHome=n&amp;:tabs=n&amp;:toolbar=n&amp;:apiID=host20#navType=0&amp;navSrc=Parse`+" width='60%' height='60%'></img>";
				}
			}
			// let finalPage = "<html><head><link rel='stylesheet' type='text/css' media='print' href='css/style.css'><style> th {background-color: #eed6de;} * { -webkit-print-color-adjust: exact !important;} .page-break-before { page-break-before: always;} .page-break-after {page-break-after: always;} </style></head>";
			// finalPage += "<body><div id='towrite><div>" + header + genInfoSec + proposalInfo + parentBho + memberBho + wacInfo +"</div>";
			// finalPage +="<div class='page-break-before'>"+ backInfoSec + baselineInfo + backgroundInfo +"</div>";
			// finalPage +="<div class='page-break-after'>"+ discountSec + discountInfo +"</div>";
			// finalPage +="<div class='page-break-before'>" + rebateSec + rebateInfo + remarkSec + remarkTable + "</div>";
			// finalPage +="<div class='page-break-before'>" + tableauSec + image + "</div></div></body></html>";	// win.document.title = fileName;
			let finalPage = `
				<html>
				<head><link rel='stylesheet' type='text/css' media='print'>
					${printStyles}
				</head>
				<body>
					<div>${header}${genInfoSec}${proposalInfo}${parentBho}</div>
					<div>${backInfoSec}${baselineInfo}${backgroundInfo}</div>
					<div>${discountSec}${discountInfo}</div>
					<div>${rebateSec}${rebateInfo}${remarkSec}${remarkTable}</div>
					<div>${tableauSec}${image}</div>
				</body>
				</html>
				`;
			let win = window.open("", "PrintWindow");
			$.each(document.styleSheets, function(index, oStyleSheet) {
				if(oStyleSheet.href){
				  var link = document.createElement("link");
				  link.type = oStyleSheet.type;
				  link.rel = "stylesheet";
				  link.href = oStyleSheet.href;
				  //win.document.head.appendChild(link); //--> this doesn't work in IE
				  win.document.getElementsByTagName("head")[0].innerHTML = win.document.getElementsByTagName("head")[0].innerHTML + link.outerHTML;
				}
			  });
			win.document.write(finalPage);
				 setTimeout(function() {
					win.print();
					win.stop();
				 }, 5000);
		},

		/*savePDF: async function(){
			const doc = new jspdf.jsPDF();
			const marginTop = 15;
			const marginLeft = 15;

			// Get DATA
			const contract = await this.getContract(this.id);
			const fileName = `proposal-${contract.Name.replace(/ /g, '-')}-${new Date().toJSON()}.pdf`;
			const discounts = await this.getDiscounts(contract);
			const discountItems = discounts.results.map(item => {
				const isDiscountTypePercentage = item.SelectedDiscountType === "Percentage";
				const mirena = isDiscountTypePercentage ? (item.Mirena === "null" ? 0+"%" : (item.Mirena*100).toFixed(1)+"%") : item.Mirena; 
				const kyleeena = isDiscountTypePercentage ? (item.Kyleena === "null" ? 0+"%" : (item.Kyleena*100).toFixed(1)+"%") : item.Kyleena; 
				const skyla = isDiscountTypePercentage ? (item.Skyla === "null" ? 0+"%" : (item.Skyla*100).toFixed(1)+"%") : item.Skyla; 
				return ["Y"+item.Year, item.Units, mirena, kyleeena, skyla]
			});
			const rebates = await this.getRebates(contract);
			const sortedRebates = rebates.results.sort((a, b) => {
				if (a.Year < b.Year) {
					return -1;
				}
				if (a.Year > b.Year) {
					return 1;
				}
				return 0;
			});
			const rebateItems = sortedRebates.map(item => ["Y"+item.Year, item.RebateLevels_Unit_Level_1, (item.RebateLevels_Discount_Level_1*100).toFixed(1)+"%", item.RebateLevels_Unit_Level_2, (item.RebateLevels_Discount_Level_2*100).toFixed(1)+"%", item.RebateLevels_Unit_Level_3, (item.RebateLevels_Discount_Level_3*100).toFixed(1)+"%"]);
			const mainCustomersTable = this.byId("mainCustomersTable");
			const mainCustomersTableItemNames = mainCustomersTable.getItems().map(item => [item.getBindingContext().getObject().BHOID]);
			const customersTable = this.byId("customersTable");
			const customersTableItemNames = customersTable.getItems().map(item => [item.getBindingContext().getObject().BHOID]);
			const whcProducts = await this.getWHCProducts();
			const wacItems = whcProducts.results.map(item => [item.ProductName, item.WAC]);

			const textContent = `Proposal ${contract.Name}`;
			doc.text(textContent, marginLeft, marginTop);

			// Calculate the dimensions of the added text
			const textDimensions = doc.getTextDimensions(textContent);

			// Calculate the Y position for the autoTable
			const autoTableY = marginTop + textDimensions.h; 		

			doc.autoTable({
				head: [
					[
						{content: "General Information", colSpan: 3, styles: { fillColor: [211, 15, 75], textColor: [255, 255, 255] }},
					],
					[
						'Proposal Name', 'Proposal Type', 'Vistex ID'
					]
				],
				body: [
					[contract.Name, contract.Type, contract.VistexID],
				],
				startY: autoTableY, // Position the table below the text
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});	

			doc.autoTable({
				head: [['Parent BHO IDs']],
				body: mainCustomersTableItemNames,
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});

			doc.autoTable({
				head: [['Member BHO IDs']],
				body: customersTableItemNames,
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});

			doc.autoTable({
				head: [['Product Name', 'WAC']],
				body: wacItems,
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});

			doc.autoTable({
				head: [
					[
						{content: "Baseline & Background Information", colSpan: 3, styles: { fillColor: [211, 15, 75], textColor: [255, 255, 255] }},
					],
					[
						'Baseline unit', 'Baseline Discount', 'Proposed Contract Length'
					]
				],
				body: [
					[contract.BaseLineUnits, `${(contract.BaseLineDiscount*100).toFixed(1)}%`, contract.ProposedContractLength],
				],
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});

			doc.autoTable({
				head: [
					[
						"Background Information",
					]
				],
				body: [
					[contract.BackgroundInfo],
				],
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99], textColor: [255, 255, 255]}
			});

			doc.autoTable({
				head: [
					[
						{content: "Discount", colSpan: 5, styles: { fillColor: [211, 15, 75], textColor: [255, 255, 255] }},
					],
					[
						'Year', 'Units', 'Mirena', 'Kyleena', 'Skyla'
					]
				],
				body: discountItems,
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});	

			doc.autoTable({
				head: [
					[
						{content: "Rebate", colSpan: 7, styles: { fillColor: [211, 15, 75], textColor: [255, 255, 255] }},
					],
					[
						{content: "Year", colSpan: 0, rowSpan: 1,styles: { valign: 'center' }},
						{content: "L1", colSpan: 2, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] }},
						{content: "L2", colSpan: 2, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] }},
						{content: "L3", colSpan: 2, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] }},
					],
					[
						'',
						'Unit',
						'Discount',
						'Unit',
						'Discount',
						'Unit',
						'Discount',
					]
				],
				body: rebateItems,
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});	

			doc.autoTable({
				head: [
					[
						{content: "Remarks", styles: { fillColor: [211, 15, 75], textColor: [255, 255, 255] }},
					]
				],
				body: [
					[contract.Remarks],
				],
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});	


			doc.autoTable({
				head: [
					[
						{content: "Tableau", styles: { fillColor: [211, 15, 75], textColor: [255, 255, 255] }},
					]
				],
				body: [],
				theme: 'grid',
				headStyles: { halign: 'center', fillColor: [98, 73, 99] }
			});	

			// Calculate the height of the table
			const tableHeight = doc.previousAutoTable.finalY;


			// Tableau
			const tableauChartHtml = this.byId("idTableauChart").getDomRef();
			const image = document.getElementById("tab");
			//const imgUrl = 'https://tableau-ncsa.aws.cnb/t/CPROD/views/WHCContractRenewalV1/WHCContractRenewal.png?Vistex%20ID=0060075938&:embed=y&:showVizHome=n&:tabs=n&:toolbar=n&:apiID=host7';
	 		// const tableauUrl = this.byId("idTableauChart").getSrc();
			// // const iFrameUrl = tableauUrl.substring("https://tableau-ncsa.aws.cnb".length);			
			// const proxyIframe = await this.printIframe(imageUrl);
			// const canvasImage = await html2canvas(proxyIframe.firstChild.contentWindow.document.documentElement);
			// canvasImage.width = 400;
			// canvasImage.height = 400;
			// doc.addImage(canvasImage, "PNG", marginLeft, tableHeight, 180, 100); // Adjust the coordinates and size as needed
			html2canvas(image).then(canvas => {
				// Convert the canvas to a data URL
				const imgData = canvas.toDataURL('image/png');
				
				// Add the image to the PDF
				doc.addImage(imgData, 'png', 10, 10, 100, 75);
				doc.save(fileName);	
			});	
			// const img = new Image();
			// img.src = imageUrl;
			// 	// Once the image is loaded, you can use it
			// 	// For example, you can add it to the page or do other operations
			// 	// Here, I'm just logging the image width and height
			// 	doc.addImage(img, 'PNG', 10, 10, 100, 75);
			// doc.save(fileName);
			doc.addImage(logo, 'png', 10, 10, 100, 75);
			doc.save(fileName);
		},

		/*getDataUri: function(url){
			return new Promise(resolve => {
				var image = new Image();
				image.setAttribute('crossOrigin', 'anonymous'); //getting images from external domain
				
				image.onload = function () {
					var canvas = document.createElement('canvas');
					canvas.width = this.naturalWidth;
					canvas.height = this.naturalHeight; 
					//next three lines for white background in case png has a transparent background
					var ctx = canvas.getContext('2d');
					ctx.fillStyle = '#fff';  /// set white fill style
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					canvas.getContext('2d').drawImage(this, 0, 0);
					resolve(canvas.toDataURL('image/png'));
				};
				image.src = url;
			})
		},

		/**
		 * Load iframe from cross-origin via proxy iframe
		 * and then invokes the print dialog.
		 * It is not possible to call window.print() on the target iframe directly
		 * because of cross-origin policy.
		 * 
		 * Downside is that the iframe stays loaded. 
		 */
		/*printIframe: function(url) {
			return new Promise((resolve, reject) => {
				const proxyIframe = document.createElement('iframe');
				const body = document.getElementsByTagName('body')[0];
				const div = document.createElement('div');
				div.style.width = '500px';
				div.style.height = '500px';
				
				proxyIframe.style.width = '100%';
				proxyIframe.style.height = '100%';
				proxyIframe.style.display = 'none';

				div.appendChild(proxyIframe);
				body.appendChild(div);
			
				var contentWindow = proxyIframe.contentWindow;
				contentWindow.document.open();
				// Set dimensions according to your needs.
				// You may need to calculate the dynamically after the content has loaded
				contentWindow.document.write('<iframe src="' + url + '" onload="' + resolve(div) + '" width="1000" height="1800" frameborder="0" marginheight="0" marginwidth="0">');
				contentWindow.document.close();
			});
		},*/


		getWHCProducts: async function () {
			// const path = this.getView().getModel().createKey("/WHCProducts", {}); 
			return new Promise((resolve, reject) => {
				this.getModel().read("/WHCProducts", {
					success: function (res) {
						resolve(res)
					},
					error: function (err) {
						reject(err)
					}
				});
			});
		},


		getContract: async function (contractId) {
			const path =this.getModel().createKey("/ContractsView", {
				ContractsViewID: contractId
            });
            let context = this.getModel().getContext(path);
			if(!context.getObject()){
				await new Promise((resolve, reject) => {
					this.getModel().read(path, {
						success: function (res) {
							resolve(res)
						},
						error: function (err) {
							reject(err)
						}
					});
				});
				context = this.getModel().getContext(path);
			}


			return context.getObject();
		},

		getDiscounts: async function (contract) {
		
            return new Promise((resolve, reject) => {
				this.getModel().read("/DiscountsView", {
					filters: [
						new Filter("ContractID", FilterOperator.EQ, contract?.ID),
						new Filter("Year", FilterOperator.LE, contract?.ProposedContractLength),
						new Filter("isCurrent", FilterOperator.EQ, contract?.isCurrent),
						new Filter("ContractsViewID", FilterOperator.EQ, contract?.ContractsViewID)
					],
					success: function (res) {
						resolve(res)
					},
					error: function (err) {
						reject(err)
					}
				});
			});
		},
		getStatusID: async function (statusText) {
		
            return new Promise((resolve, reject) => {
				this.getModel().read("/WHCStatus", {
					filters: [
						new Filter("StatusText", FilterOperator.EQ, statusText)
					],
					success: function (res) {
						resolve(res?.results?.[0]?.ID)
					},
					error: function (err) {
						reject(err)
					}
				});
			});
		},

		getRebates: async function (contract) {

			let oneSecondLaterValidFromDate = new Date(contract?.ValidFrom);
			oneSecondLaterValidFromDate.setSeconds(oneSecondLaterValidFromDate.getSeconds() + 1);

			const filters = [
				new Filter("ContractsViewID", "EQ", contract?.ContractsViewID),
				new Filter("Year", "LE", contract?.ProposedContractLength)
			];

			// for history data we need additional filter
			if(!contract.isCurrent){
				const oFilterStartDate = new Filter("ValidFrom", FilterOperator.GE, contract?.ValidFrom);
				const oFilterEndDate = new Filter("ValidFrom", FilterOperator.LE, oneSecondLaterValidFromDate);
				filters.push(new Filter({
					filters: [oFilterStartDate, oFilterEndDate],
					and: true
				}));
			}

			return new Promise((resolve, reject) => {
				this.getModel().read("/RebatesView", {
					filters: filters,
					success: function (res) {
						resolve(res)
					},
					error: function (err) {
						reject(err)
					}
				});
			});
		},

		getSavedDiscountType: async function (contractViewID) {
			const contract = await this.getContract(contractViewID);
			const discounts = await this.getDiscounts(contract);
			return discounts?.results?.[0]?.SelectedDiscountType || "Percentage";
		},

		calculateDiscountProductsPercentage: function () {
			const discountTable = this.byId("discountsTable");
			const items = discountTable.getItems();
			const selectedDiscountType = this.getModel("detailView").getProperty("/selectedDiscountType");

			items.map(item => {
				const context = item.getBindingContext();
				const obj = context.getObject();
				if (selectedDiscountType === "Value") {
					this.getModel().setProperty('Mirena', obj.Mirena / 100, context);
					this.getModel().setProperty('Kyleena', obj.Kyleena / 100, context);
					this.getModel().setProperty('Skyla', obj.Skyla / 100, context);
				}
				this.getModel().setProperty('SelectedDiscountType', selectedDiscountType, context);
			})		
		},

		loadDiscountFragment: function(discountType){
			const vbox = this.byId("idDiscountVbox");
			vbox.destroyItems();
			return Fragment.load({
				id: this.getView().getId(),
				name: `com.bayer.tender.whcapp.view.fragments.DiscountType${discountType}`,
				controller: this
			}).then(function (table) {

				vbox.addItem(table);
				return table;
			}.bind(this));
		},

		getVistexData: async function () {
			return new Promise((resolve, reject) => {
				this.getModel().read("/VistexData", {
					success: function (res) {
						resolve(res)
					},
					error: function (err) {
						reject(err)
					}
				});
			});
		},

		onVistexIdChange: async function(event){

			// Get the user-input VistexId
			let source = event.getSource();
			let vistexId = event.getParameter("value");
			let contract = await this.getContractById(this.id);
			const vistexData = await this.getVistexData();
			const vistexItems = vistexData.results.filter(item => item.VistexID === vistexId);

			if (vistexItems.length < 1) {
				source.setValueState("Error");
                source.setValueStateText("Invalid Vistex ID");
                source.openValueStateMessage();
			}else {
				source.setValueState("None");
                source.setValueStateText("");
                source.closeValueStateMessage();
			}

			// Update the MultiInput fields with fetched data
			let mainCustomersTable = this.getView().byId("mainCustomersTable");
			let customersTable = this.getView().byId("customersTable");

			// Clear the existing items in the tables
			mainCustomersTable.removeAllItems();
			customersTable.removeAllItems();

			//  // Clear the existing items in the tables
			//  mainCustomersTable.unbindItems();
			//  customersTable.unbindItems();
			// Create a Set to store unique ParentBHOID values
			let uniqueParentBHOIDs = new Set();
		 
			 // Add tokens for MemberBhoid and ParentBhoid based on vistexItems
			 vistexItems.forEach(function (vistexItem) {
				if (!uniqueParentBHOIDs.has(vistexItem.ParentBHOID)) {
				 mainCustomersTable.addItem(
					 new sap.m.ColumnListItem({
						 cells: [
							 new sap.m.Text({ text: vistexItem.ParentBHOID })
						 ]
					 })
				 );
					 // Add the ParentBHOID to the Set to avoid duplicates
					 uniqueParentBHOIDs.add(vistexItem.ParentBHOID);
				}
		 
				 customersTable.addItem(
					 new sap.m.ColumnListItem({
						 cells: [
							 new sap.m.Text({ text: vistexItem.MemberBHOID })
						 ]
					 })
				 );
			 });

			this.mapBHOIdsPendingChanges(contract);

			// Clear the existing items in the tables
			mainCustomersTable.removeAllItems();
			customersTable.removeAllItems();

			return new Promise((resolve, reject) => {
				this.getModel().submitChanges({
					error: this.contractSavedError.bind(this)
				});
			});
		
		},

		mapBHOIdsPendingChanges: function (contract) {
			const mainCustomersTable = this.getView().byId("mainCustomersTable");
			const mainCustomerItems = mainCustomersTable.getItems();
			const customersTable = this.getView().byId("customersTable");
			const customerItems = customersTable.getItems();
			let contractcustomer = [];
			
			const createContractEntry = (BHOID, IsParent) => {
				return this.getOwnerComponent().getModel().createEntry("/ContractCustomersView", {
					properties: {
						"BHOID": BHOID,
						"Name": '',
						"ContractID": contract.ID,
						"IsParent": IsParent
					}
    			});
  			};

			for (const mainCustomerItem of mainCustomerItems) {
				contractcustomer.push(createContractEntry(mainCustomerItem?.getAggregation("cells")[0]?.getText(), true));
			}

			for (const customerItem of customerItems) {
				contractcustomer.push(createContractEntry(customerItem?.getAggregation("cells")[0]?.getText(), false));
			}

		}

		
	});

});