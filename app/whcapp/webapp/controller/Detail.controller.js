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

		filterDiscountsTable: async function () {
			const discountTable = this.byId("discountsTable");
			const template = discountTable.getBindingInfo("items").template;
			const contract = await this.getContractById();
			const filter = [
				new Filter("ContractID", FilterOperator.EQ, this.id),
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
					new Filter("ContractID", "EQ", this.id),
					new Filter("Year", "LE", contract?.ProposedContractLength),
				],
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

			if (value < 1 || value > 6) {
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
					success: this.contractSavedSuccess.bind(this),
					error: this.contractSavedError.bind(this)
				});
			})
		},

		

		onSave: async function () {
			try {
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
				MessageBox.success("Contract Updated: " + this.getView().getBindingContext().getProperty("ID"));
				this.getModel("appView").setProperty("/editmode", false);
				this.oDynamicPage.setShowFooter(false);
				this.filterDiscountsTable();
				this.bindRebatesTable();
				this.getModel().refresh();
			}
			this.getModel("detailView").setProperty("/busy", false);
		},

		contractSavedError: function (error) {

		},

		onMenuAction: function (event) {
			let selectedItem = event.getParameter("item");
			let selectedText = selectedItem.getText();
		  
			// Update the "Status" Text element's text property based on the selected menu item
			let statusText = this.getView().byId("idStatus");
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
						const Mirena = formatter.parsePercentage(obj.Mirena);
						const Kyleena = formatter.parsePercentage(obj.Kyleena);
						const Skyla = formatter.parsePercentage(obj.Skyla);
						this.getModel().setProperty(`${path}/Mirena`, Mirena ? Math.trunc(Mirena * 100) + "" : Mirena);
						this.getModel().setProperty(`${path}/Kyleena`, Kyleena ? Math.trunc(Kyleena * 100) + "" : Kyleena);
						this.getModel().setProperty(`${path}/Skyla`, Skyla ? Math.trunc(Skyla * 100) + "" : Skyla);
					})
					break;
				case "Percentage":
					items.map(item => {
						const obj = item.getBindingContext().getObject();
						const path = item.getBindingContext().getPath();
						const Mirena = formatter.formatPercentage(obj.Mirena);
						const Kyleena = formatter.formatPercentage(obj.Kyleena);
						const Skyla = formatter.formatPercentage(obj.Skyla);
						this.getModel().setProperty(`${path}/Mirena`, Mirena);
						this.getModel().setProperty(`${path}/Kyleena`, Kyleena);
						this.getModel().setProperty(`${path}/Skyla`, Skyla);
					})
					break;
				default:
					break;
			}
		},

		onPrintButtonPress: function(event){
			this.savePDF();	
		},

		savePDF: async function(){
			const doc = new jspdf.jsPDF();
			const marginTop = 15;
			const marginLeft = 15;

			// Get DATA
			const contract = await this.getContract(this.id);
			const fileName = `proposal-${contract.Name.replace(/ /g, '-')}-${new Date().toJSON()}.pdf`;
			const discounts = await this.getDiscounts(this.id, contract.ProposedContractLength);
			const discountItems = discounts.results.map(item => ["Y"+item.Year, item.Units, item.Myrena, item.Kyleena, item.Skyla]);
			const rebates = await this.getRebates(this.id, contract.ProposedContractLength);
			const sortedRebates = rebates.results.sort((a, b) => {
				if (a.Year < b.Year) {
					return -1;
				}
				if (a.Year > b.Year) {
					return 1;
				}
				return 0;
			});
			const rebateItems = sortedRebates.map(item => ["Y"+item.Year, item.RebateLevels_Unit_Level_1, item.RebateLevels_Discount_Level_1, item.RebateLevels_Unit_Level_2, item.RebateLevels_Discount_Level_2, item.RebateLevels_Unit_Level_3, item.RebateLevels_Discount_Level_3]);
			const mainCustomersTable = this.byId("mainCustomersTable");
			const mainCustomersTableItemNames = mainCustomersTable.getItems().map(item => [item.getBindingContext().getObject().Name]);
			const customersTable = this.byId("customersTable");
			const customersTableItemNames = customersTable.getItems().map(item => [item.getBindingContext().getObject().Name]);
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
					[contract.BaseLineUnits, `${contract.BaseLineDiscount*100}%`, contract.ProposedContractLength],
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
			const canvasImage = await html2canvas(tableauChartHtml);
			doc.addImage(canvasImage, "PNG", marginLeft, tableHeight, 180, 100); // Adjust the coordinates and size as needed

			// print
			doc.save(fileName);	
		},


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
				ID: contractId
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

		getDiscounts: async function (contractId, contractLength) {
		
            return new Promise((resolve, reject) => {
				this.getModel().read("/DiscountTableView", {
					filters: [
						new Filter("ContractID", "EQ", contractId),
						new Filter("Year", "LE", contractLength),
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

		getRebates: async function (contractId, contractLength) {
			return new Promise((resolve, reject) => {
				this.getModel().read("/Rebates", {
					filters: [
						new Filter("ContractID", "EQ", contractId),
						new Filter("Year", "LE", contractLength),
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
	});

});