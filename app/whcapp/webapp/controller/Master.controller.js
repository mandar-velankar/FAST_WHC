sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
    "sap/ui/model/FilterType",
	"sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
	"sap/m/MessageToast",
], function (BaseController, JSONModel, Device, Fragment, Filter, FilterType, Sorter, FilterOperator,MessageToast) {
	"use strict";

	return BaseController.extend("com.bayer.tender.whcapp.controller.Master", {
		onInit: function () {
			const viewModel = new JSONModel({
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
                showHighlight: false
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
			data?.ID && this._showDetail(data.ContractsViewID);
		},
		_onMasterMatched: async function (event) {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
			this.byId("masterTable").removeSelections(true);
            this.setFilter();
		},
		_showDetail: function (id) {
			var bReplace = !Device.system.phone;
			this.getRouter().navTo("object", { id: id }, bReplace);
		},

		onOpenCreateProposalDialog: async function(event){
			let that = this;

			if (!this.byId('idCreateProposalPopup')){
				this.createProposalDialog = await Fragment.load({
					id: that.getView().getId(),
					name: "com.bayer.tender.whcapp.view.fragments.CreateProposal",
					controller: that,
				}).then(function (oDialog){
					oDialog.setResizable(false);
					oDialog.setStretch(false);
					that.getView().addDependent(oDialog);
					oDialog.open();
					that._bindCreateProposalForm();
				});
			} else {
				this.byId("idCreateProposalPopup").open();
			}
		},

		_bindCreateProposalForm: async function () {
			const entity = "ContractsView";
			const form = this.byId("idNewProposalForm");
			const newEntryContext = this.getOwnerComponent().getModel().createEntry(`/${entity}`);
			const path = newEntryContext.getPath();
			form?.bindElement({
				path: path
			});
		},

		onCloseCreateProposalPopup: function(){
			const bindingPath = this.byId("idNewProposalForm").getBindingContext().getPath().replace("/", "");
			//this.cancelPendingChanges([bindingPath], "newProposalMsg");
			this.byId("idCreateProposalPopup").close();			
			this.byId("idCreateProposalPopup").destroy();
		},

        /**
         * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
         * @param {sap.ui.base.Event} oEvent the button press event
         * @public
         */
        onOpenViewSettings: function (oEvent) {
            var sDialogTab = "filter";
            if (oEvent.getSource() instanceof sap.m.Button) {
                var sButtonId = oEvent.getSource().getId();
                if (sButtonId.match("sort")) {
                    sDialogTab = "sort";
                } else if (sButtonId.match("group")) {
                    sDialogTab = "group";
                }
            }
            // load asynchronous XML fragment
            if (!this.byId("viewSettingsDialog")) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.bayer.tender.whcapp.view.fragments.ViewSettingsDialog",
                    controller: this
                }).then(function (oDialog) {
                    // connect dialog to the root view of this component (models, lifecycle)
                    this.getView().addDependent(oDialog);
                    oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
                    oDialog.open(sDialogTab);
                }.bind(this));
            } else {
                this.byId("viewSettingsDialog").open(sDialogTab);
            }
        },

        /**
         * Event handler called when ViewSettingsDialog has been confirmed, i.e.
         * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
         * are applied to the list, which can also mean that they
         * are removed from the list, in case they are
         * removed in the ViewSettingsDialog.
         * @param {sap.ui.base.Event} oEvent the confirm event
         * @public
         */
        onConfirmViewSettingsDialog: function (oEvent) {

            this._applySortGroup(oEvent);
        },

        /**
         * Apply the chosen sorter and grouper to the list
         * @param {sap.ui.base.Event} oEvent the confirm event
         * @private
         */
        _applySortGroup: function (oEvent) {
            var mParams = oEvent.getParameters(),
                sPath,
                bDescending,
                aSorters = [];

            sPath = mParams.sortItem.getKey();
            bDescending = mParams.sortDescending;
            aSorters.push(new Sorter(sPath, bDescending));
            this.byId("masterTable").getBinding("items").sort(aSorters);
        },

		setFilter: function (oEvent) {
            const list = this.byId("masterTable").getBinding("items");
            const pageColumnLayout =  this.getModel("appView").getProperty("/layout"); 
            let orFilters = [];
            let andFilters = [];
			
            // Proposal Status Filter 
            const selectedItemKeyOfStatus = this.byId("idSlctStatus").getSelectedItem()?.getKey();
            if (selectedItemKeyOfStatus && pageColumnLayout === "OneColumn" && !selectedItemKeyOfStatus.toLowerCase().includes('all')) {
                andFilters.push(new Filter("Status", FilterOperator.Contains, selectedItemKeyOfStatus, false));
            }

            // Proposal Type filter
            const selectedItemKeyOfContractType = this.byId("idSlctType").getSelectedItem()?.getKey();
            if (selectedItemKeyOfContractType && !selectedItemKeyOfContractType.toLowerCase().includes('all')) {
                andFilters.push(new Filter("TypeID", FilterOperator.Contains, selectedItemKeyOfContractType, false));
            }
            // Searching 
            let sSearch = oEvent?.getParameter("query");
            if (sSearch) {
                orFilters.push(new Filter({
                    path: "Name",
                    operator: FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }));
                orFilters.push(new Filter({
                    path: "TypeID",
                    operator: FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }));
				orFilters.push(new Filter({
                    path: "Status",
                    operator: FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }));
                orFilters.push(new Filter({
                    path: "ParentAccountName",
                    operator: FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }));

                // Handling Dates
                if (isNaN(Number(sSearch))) {
                    let reg = /[0-9]{2}[.][0-9]{2}[.][0-9]+/g;
                    if (sSearch.search(reg) == 0) {

                        let newDate = sSearch.split(".").reverse();

                        // As months are counting from 0 index It takes prev month
                        if (newDate[1] > 0 && newDate[1] <= 11) {
                            newDate.splice(1, 1, Number(newDate[1])-1);
                        }
                        
                        orFilters.push(new Filter({
                            path: "createdAt",
                            operator: FilterOperator.GE,
                            value1: new Date(Date.UTC(...newDate)),
                            caseSensitive: false
                        }));

                        orFilters.push(new Filter({
                            path: "modifiedAt",
                            operator: FilterOperator.GE,
                            value1: new Date(Date.UTC(...newDate)),
                            caseSensitive: false
                        }));
                    }
                }
                orFilters.push(new Filter({
                    path: "createdBy",
                    operator: FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }));

                orFilters.push(new Filter({
                    path: "modifiedBy",
                    operator: FilterOperator.Contains,
                    value1: sSearch,
                    caseSensitive: false
                }));

                andFilters.push(new Filter(orFilters, false));
            }

            if (andFilters.length > 0) {
                let oFilter = new Filter(andFilters, true);
                list.filter(oFilter);
            }else {
                list.filter();
            }
        },

		onSaveProposal: async function () {
			
			const oNewProposalForm = this.byId("idNewProposalForm");
			this.setNewProposalPendingChanges(oNewProposalForm);
			this.getModel().submitChanges({
				success: this._onSubmitChangesSuccess.bind(this),
				error: this._onSubmitChangesFail.bind(this)
			});
		},
		_onSubmitChangesFail: function (error) {
			// not implemented
		},

		_onSubmitChangesSuccess: function (res) {
			const newContractCtx = this.byId("idNewProposalForm").getElementBinding().getBoundContext();
			const ctxPath = newContractCtx.getPath().replace("/", "");
            const newContractObj = newContractCtx.getObject();
			const hasErrorMessages = this.getMessages([ctxPath]).length > 0;
			//this.setMessageSection([ctxPath], "newProposalMsg");
			if (!hasErrorMessages) {
				MessageToast.show("Proposal has been created successfully");
				this.onCloseCreateProposalPopup();
				this.byId("masterTable")?.getBinding("items")?.refresh();
                this._showDetail(newContractObj.ContractsViewID);
			}
		},
		setNewProposalPendingChanges: function (oForm) {
			const oDefaultModel = oForm.getModel();
			const oBoundContext = oForm.getElementBinding().getBoundContext();
			const newProposalObj = oBoundContext.getObject();

			newProposalObj.Type = this.byId('idGroupType').getSelectedButton().getText();
			const oNewBindingCtx = oDefaultModel.createEntry("/ContractsView", {
				properties: newProposalObj
			});
			oForm?.bindElement({
				path: oNewBindingCtx.getPath()
			});
			oDefaultModel.resetChanges([oBoundContext.getPath()]);
		},
	});

});