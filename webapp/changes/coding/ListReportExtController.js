/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 * @controller Name:sap.suite.ui.generic.template.ListReport.view.ListReport,
 * @viewId:ui.s2p.mm.extpr.manage.s1::sap.suite.ui.generic.template.ListReport.view.ListReport::C_ExtPurchaseRequisitionItem
 */
sap.ui.define([
		"sap/ui/core/mvc/ControllerExtension",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/comp/filterbar/FilterBar",
		"sap/m/Dialog",
		"sap/m/Button",
		"sap/ui/core/Fragment",
		"sap/ui/comp/valuehelpdialog/ValueHelpDialog",
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageBox",
		"sap/m/BusyDialog",
		"vwks/nlp/s2p/mm/prcentral/manage/changes/utils/Formatter",
		"vwks/nlp/s2p/mm/reuse/lib/supplierStatus/SupplierStatuses",
		"vwks/nlp/s2p/mm/prcentral/manage/changes/coding/SupplierQuickView",
		"sap/m/MessageToast",
		"sap/m/MessageItem",
		"sap/m/MessageView",
		"sap/m/Bar",
		"sap/m/Text",
		"sap/m/Label",
		"sap/m/ColumnListItem",
		"sap/m/SearchField",
		"sap/ui/core/ValueState",
		"vwks/nlp/s2p/mm/reuse/lib/util/NavigationHelper",
		"vwks/nlp/s2p/mm/reuse/lib/util/Formatter",
		"vwks/nlp/s2p/mm/reuse/lib/util/BaseExtensionController",
		"vwks/nlp/s2p/mm/reuse/lib/documentHistory/type/ApplicationType",
		"vwks/nlp/s2p/mm/reuse/lib/documentHistory/DocumentHistoryHelper",
		"sap/base/Log"
	],
	function (
		ControllerExtension,
		Filter,
		FilterOperator,
		FilterBar,
		Dialog,
		Button,
		Fragment,
		ValueHelpDialog,
		JSONModel,
		MessageBox,
		BusyDialog,
		Formatter,
		SupplierStatuses,
		SupplierQuickView,
		MessageToast,
		MessageItem,
		MessageView,
		Bar,
		Text,
		Label,
		ColumnListItem,
		SearchField,
		ValueState,
		NavigationHelper,
		ReuseFormatter,
		BaseExtensionController,
		ApplicationType,
		DocumentHistoryHelper,
		Log
	) {
		"use strict";

		return ControllerExtension.extend("vwks.nlp.s2p.mm.prcentral.manage.ListReportExtController", Object.assign({}, BaseExtensionController, {
			override: {
				onInit: function () {
					this._oView = this.getView();
					this._oController = this._oView.getController();

					this._createModel();
					//i18n Resource model for translation
					var oi18nModel = this.getView().getController().getOwnerComponent().getModel("i18n");
					if (oi18nModel) {
						this._oResourceBundle = oi18nModel.getResourceBundle();
					}
					this.sListReportId = "ui.s2p.mm.extpr.manage.s1::sap.suite.ui.generic.template.ListReport.view.ListReport::";
					this._oPurchaseRequsitionSmartTable = this.base.byId(
						this.sListReportId + "C_ExtPurchaseRequisitionItem--listReport"
					);
					this._oPurchaseRequsitionTable = this.base.byId(
						this.sListReportId + "C_ExtPurchaseRequisitionItem--responsiveTable"
					);

					this._oPurchaseRequsitionSmartTable.attachEvent("dataReceived", this.onDataReceived.bind(this));
					if (this._oPurchaseRequsitionTable) {
						this._oPurchaseRequsitionTable.attachEvent("selectionChange", this.onSelectionChangeTable.bind(this));
					}

					//set model for reassign popup
					var reassignPurGrpModel = new JSONModel();
					this._oView.setModel(reassignPurGrpModel, "reassignPurGrpModel");

					//set settings model for smart table
					var purReqSettingsModel = new JSONModel({
						purchaseRequisitionsNumber: 0
					});
					this._oView.setModel(purReqSettingsModel, "purReqSettingsModel");
					var oNotesModel = new JSONModel();
					this._oView.setModel(oNotesModel, "NotesModel");

					//set template model for reassign/close comments
					this.oTemplateModel = this._oController.getOwnerComponent().getModel("TemplateModel");

					this.oSupplierStatuses = new SupplierStatuses(this._oView, this._oResourceBundle);
					this.oSupplierQuickView = new SupplierQuickView(this._oView, this._oResourceBundle);

					//set settings model for smart table
					var oDisplayActiveReasonModel = new JSONModel({});
					this._oView.setModel(oDisplayActiveReasonModel, "DisplayReasonModel");

					//hide CPR button
					var oPurchaseRequisitionButton = this.getView().byId("ActionC_ExtPurchaseRequisitionItem2button");
					oPurchaseRequisitionButton.setVisible(false);

					//hide CCC button
					var oCentralPurchaseContractButton = this.getView().byId("ActionC_ExtPurchaseRequisitionItem4button");
					oCentralPurchaseContractButton.setVisible(false);
				},
				/*
				 * overriding life cycle method to add additional fields for odata service call 
				 */
				onAfterRendering: function () {
					// Keeping instance of model 
					this._oModel = this._oView.getModel();
					this._detachStandardCreateCtrH();
					this._detachStandardCreatePO();
				},
				"templateBaseExtension": {
					ensureFieldsForSelect: function (fnEnsureSelectionProperty, sControlId) {
						var aNewRequestedFields = ["DeliveryStatusText", "ItemNetAmount", "xvwksxnlp_pgp_date", "ReassignMaterialGroup_fc",
							"ProcmtHubPurRequisitionType", "ProcmtHubPurchasingOrg", "LocalAmount", "LocalCurrency", "NumberOfUniquePR", "HasNote",
							"ProcmtHubPurchasingGroup", "SupplierOverallStatus", "xvwksxnlp_comment"
						];
						for (var sFieldname in aNewRequestedFields) {
							if (aNewRequestedFields[sFieldname]) {
								fnEnsureSelectionProperty(this, aNewRequestedFields[sFieldname]);
							}
						}
					}
				}
			},

			/**
			 * Create view model.
			 * @public
			 */
			_createModel: function () {
				this._oMPRCSettingsModel = new JSONModel({
					checkInformRequestor: false,
					enableCommentSave: true
				});
				this.getView().setModel(this._oMPRCSettingsModel, "MPRCSettingsModel");
			},
			/**
			 * Override press event for the standard 'Create Contract Hierarchy' button.
			 * @private
			 */
			_detachStandardCreateCtrH: function () {
				var oCreateCtrHBtn = this.base.byId("CreateContractHierarchy");
				var oParentController = this.base.getView().getController();
				// Detach standard method handler and Attach custom method handler
				if (oParentController.onClickCreateHCTR && typeof oParentController.onClickCreateHCTR === "function") {
					oCreateCtrHBtn.detachEvent("press", oParentController.onClickCreateHCTR, oParentController);
					oCreateCtrHBtn.attachEvent("press", this.onCreateCTRHPress.bind(this));
				} else {
					Log.fatal("Function onClickCreateHCTR does not exist");
				}
			},

			/**
			 * Override press event for the standard 'Create Contract Hierarchy' button.
			 * @private
			 */
			_detachStandardCreatePO: function () {
				var oCreateCtrHBtn = this.base.byId("CreatePurchaseOrderButton");
				var oParentController = this.base.getView().getController();
				// Detach standard method handler and Attach custom method handler
				if (oParentController.onClickCreatePurchaseOrder && typeof oParentController.onClickCreatePurchaseOrder === "function") {
					oCreateCtrHBtn.detachEvent("press", oParentController.onClickCreatePurchaseOrder, oParentController);
					oCreateCtrHBtn.attachEvent("press", this.onCreatePurchaseOrder.bind(this));
				} else {
					Log.fatal("Function onClickCreatePurchaseOrder does not exist");
				}
			},

			/**
			 * Handle smart table data received event.
			 * Set the number of Purchase Requisitions.
			 * @param {sap.ui.base.Event} oEvent - data receive event
			 * @public
			 */
			onDataReceived: function (oEvent) {
				var aPurReqItems = oEvent.getParameters().getParameter("data").results;
				var iPurReqNumber = aPurReqItems.length ? aPurReqItems[0].NumberOfUniquePR : 0;
				this._oView.getModel("purReqSettingsModel").setProperty("/purchaseRequisitionsNumber", iPurReqNumber);

				// Disable Process Centrally Switch in all rows of table - NLO-3094
				var sSwitchIDRegex = this._oController.createId("_IDEGen_switch0-__clone");

				// Purchase requisition items
				var oPurchaseRequisitionItems = this._oPurchaseRequsitionTable.getItems();
				var oPurchaseRequisitionItemCells, sCellId;
				for (var iItemIndex = 0; iItemIndex < oPurchaseRequisitionItems.length; iItemIndex++) {
					// Purchase requisition item cells
					oPurchaseRequisitionItemCells = oPurchaseRequisitionItems[iItemIndex].getCells();
					for (var iCellIndex = 0; iCellIndex < oPurchaseRequisitionItemCells.length; iCellIndex++) {
						sCellId = oPurchaseRequisitionItemCells[iCellIndex].getId();
						// Check if cell ID contains the switch ID and the switch exists
						if (sCellId.includes(sSwitchIDRegex) && this.base.byId(sCellId)) {
							// Disable switch
							this.base.byId(sCellId).setEnabled(false);
							// Do not check for further cells
							break;
						}
					}
				}
				var selectAllChkBox = this.getView().byId(
					"ui.s2p.mm.extpr.manage.s1::sap.suite.ui.generic.template.ListReport.view.ListReport::C_ExtPurchaseRequisitionItem--responsiveTable-sa"
				);
				if (selectAllChkBox) {
					selectAllChkBox.setVisible(true);
				}
			},

			/**
			 * Handle table selection change       
			 * @param {object} oEvent - row selection event
			 * @public                                                                                                                                                                       
			 */
			onSelectionChangeTable: function (oEvent) {
				var enableMaterialGroupForSelectedItems = true;
				var selectedMaterialGroup = "";
				var oSelectedItems = this._oPurchaseRequsitionTable.getSelectedContexts();

				if (!this.oValidateReasonButton) {
					this._oValidateReasonButton = this.byId("idDisplayInactiveActionBtn");
				}

				if (oSelectedItems && oSelectedItems.length > 0) {
					this._oValidateReasonButton.setEnabled(true);
					for (var i = 0; i < oSelectedItems.length; i++) {
						var enableMaterialGroup = oSelectedItems[i].getProperty("ReassignMaterialGroup_fc");
						if (enableMaterialGroup === true) {
							enableMaterialGroupForSelectedItems = true;
						} else {
							enableMaterialGroupForSelectedItems = false;
							break;
						}
					}

					if (oSelectedItems.length === 1) {
						selectedMaterialGroup = oSelectedItems[0].getProperty("ProcmtHubProductGroup");
					}

					// set local model for reassign purchase group dialog
					var data = {
						enableMaterialGroup: enableMaterialGroupForSelectedItems,
						materialGroup: selectedMaterialGroup
					};
					this._oView.getModel("reassignPurGrpModel").setData(data);
				} else {
					this._oValidateReasonButton.setEnabled(false);
				}
			},

			/*
			 * 'Create Central Contract Hierarchy' button event handler- code is copied from standard app
			 * Call FI and navigate to intermediate screen.
			 * @param {sap.ui.base.Event} oEvent - button press event
			 * @public 
			 */
			onCreateCTRHPress: function (oEvent) {
				this.hctrSuccessCount = 0;
				this.HierContractFlag = true;
				if (oEvent) {
					this.validateFlagForCreateHCTR = true;
				} else {
					this.validateFlagForCreateHCTR = false;
				}

				var aSelectedPRItemsCtx = this._oPurchaseRequsitionTable.getSelectedContexts();
				for (var iSelectedPRCount = 0; iSelectedPRCount < aSelectedPRItemsCtx.length; iSelectedPRCount++) {
					var oContextData = aSelectedPRItemsCtx[iSelectedPRCount].getProperty(aSelectedPRItemsCtx[iSelectedPRCount].getPath());
					var oPayload = {
						"HierContractFlag": this.HierContractFlag,
						"PurchaseRequisition": oContextData.ProcmtHubPurchaseRequisition,
						"PurchaseRequisitionItem": oContextData.ProcmtHubPurRequisitionItem,
						"ProcurementHubSourceSystem": oContextData.ProcurementHubSourceSystem,
						"Validate": this.validateFlagForCreateHCTR // Flag for backend check of existing HCTR
					};
					this._oModel.callFunction("/CreateCentralContract", {
						method: "POST",
						urlParameters: oPayload,
						success: this.successCreateHCTR.bind(this),
						error: this.errorCreateCCTR.bind(this)
					});

				}
			},

			/*
			 * If creation of HCTR is successfull, count the number of HCTRs created- code is copied from standard app
			 * @param {object} data
			 * @param {object} oResponse - success response
			 * @public 
			 */
			successCreateHCTR: function (data, oResponse) {
				//code is copied from standard app
				if (oResponse.headers["sap-message"] === undefined && this.hctrSuccessCount === 0) {
					this.hctrSuccessCount++;
					var hctrno = data.PurReqnFllwOnDocDrftHdrUUID;
					if (hctrno !== "") {
						//Navigate to Create hierarchy contract
						NavigationHelper.navigateToOutboundTarget(this._oController, "CreateHierarchyContract", {
							Guid: hctrno
						});
					}
				} else if (oResponse.headers["sap-message"] !== undefined && this.hctrSuccessCount === 0 && this.validateFlagForCreateHCTR) {
					this.hctrSuccessCount++;
					MessageBox.warning(JSON.parse(oResponse.headers["sap-message"]).message, {
						actions: [MessageBox.Action.YES, MessageBox.Action.NO],
						onClose: function (oAction) {
							if (oAction === MessageBox.Action.YES) {
								this.onCreateCTRHPress();
							} else {
								this.base.byId("CreateContractHierarchy").setEnabled(true);
							}
						}.bind(this)
					});
				}
				this._oModel.submitChanges(this.successCreateHCTR.bind(this), this.errorCreateDraft.bind(this), true);
			},

			/*
			 * If creation of HCTR fails, show error- code is copied from standard app
			 * @param {object} err - error object
			 * @public 
			 */
			errorCreateCCTR: function (err) {
				//code is copied from standard app
				MessageBox.show((JSON.parse(err.responseText).error.message.value));
			},

			/*
			 * If creation of HCTR draft fails, show error- code is copied from standard app
			 * @param {object} err - error object
			 * @public 
			 */
			errorCreateDraft: function (err) {
				//code is copied from standard app
				sap.ui.core.BusyIndicator.hide();
			},

			/**
			 * Handle live change of template name 
			 */

			/**
			 * Close Purchase Requisition Continue event handler.
			 * Call "ClosePrItems" function import (overide standard "Continue" button).
			 * @param {sap.ui.base.Event} oEvent press event object 
			 * @public
			 */

			onClosePRContinue: function (oEvent) {

				// Initialize the variable storing the number of requests and responses
				this.noofBatchRequest = 0;
				this.noofResponse = 0;

				// Get the table of selected PRs that the user selects on the PR list page
				var oSelectedItems = this._oPurchaseRequsitionTable.getSelectedContexts();
				var oPayload = [];
				//Making the TextArea of closeAction mandatory

				var oCloseCommentTextArea = sap.ui.getCore().byId("idClosurComment");
				oCloseCommentTextArea.attachLiveChange(this.onTemplateInputLiveChange.bind(this));
				var oCloseCommentTextAreaValue = oCloseCommentTextArea.getValue();
				if (oCloseCommentTextAreaValue === "") {
					oCloseCommentTextArea.setValueState("Error");
					var stext = this.getView().getModel("i18n").getResourceBundle().getText("AlertTextClose");
					oCloseCommentTextArea.setValueStateText(stext);
				} else {
					for (var iSelectedPRCount = 0; iSelectedPRCount < oSelectedItems.length; iSelectedPRCount++) {

						// Get the Context data of teh selected item
						var oContextData = oSelectedItems[iSelectedPRCount].getProperty(oSelectedItems[iSelectedPRCount].getPath());
						// Prepare the Payload to be used to fire the GW call
						oPayload = {
							ProcmtHubPurchaseRequisition: oContextData.ProcmtHubPurchaseRequisition,
							ProcmtHubPurRequisitionItem: oContextData.ProcmtHubPurRequisitionItem,
							ProcurementHubSourceSystem: oContextData.ProcurementHubSourceSystem,
							ProcmtHubPurRequisitionType: oContextData.ProcmtHubPurRequisitionType,
							ProcmtHubPurchasingGroup: oContextData.ProcmtHubPurchasingGroup,
							ProcmtHubPurchasingOrg: oContextData.ProcmtHubPurchasingOrg,
							ProcmtHubPlant: oContextData.ProcmtHubPlant,
							ClosureComment: sap.ui.getCore().byId("idClosurComment").getValue(),
							InformRequestorFlag: this._oMPRCSettingsModel.getProperty("/checkInformRequestor")
						};
						//Call function import to update the close indicator of the purchase requisition
						this._oModel.callFunction("/ClosePrItems", {
							method: "POST",
							urlParameters: oPayload,
							success: this.successClosePrItems.bind(this),
							error: this.errorClosePrItems.bind(this)
						});
						// Increment the variable that tracks the number of requests fired
						this.noofBatchRequest++;

					}
					this.closePrItemsCancel();
				}

			},
			/*
			 * Success handler for the "ClosePrItems" function import call.
			 * @param {oResponse} oResponce - responce object
			 * @public
			 */
			successClosePrItems: function (oResponse) {
				// Increment the variable that tracks the number of responses received
				this.noofResponse++;
				if (this.noofBatchRequest === this.noofResponse) {
					this._oPurchaseRequsitionTable.removeSelections();
					this.base.getView().getController().extensionAPI.refreshTable();
					MessageToast.show(this._oView.getModel("i18n").getResourceBundle().getText("ClosePrItemsSucessMsg"));
					this._oView.setBusy(false);
				}
			},
			/*
			 * Error handler for the "ClosePrItems" function import call.
			 * @param {object} oResponce responce object with an error
			 * @public
			 */
			errorClosePrItems: function (oResponse) {
				this.noofResponse++;
				if (this.noofBatchRequest === this.noofResponse) {
					this._oView.setBusy(false);
					MessageBox.error(JSON.parse(oResponse.responseText).error.message.value);
					this._oPurchaseRequsitionTable.removeSelections();
				}
			},

			/**
			 * Close and destroy "Close Purchase Requisition" dialog.
			 * @param {sap.ui.base.Event} oEvent press event object 
			 * @public
			 */
			closePrItemsCancel: function (oEvent) {
				var oClosePRDialog = sap.ui.getCore().byId("_IDEGen_dialog003");
				oClosePRDialog.close();
				oClosePRDialog.destroy();
				this.getView().removeDependent(oClosePRDialog);
				oClosePRDialog = null;
			},

			/**
			 * Function import call for reassigning purchasing group and material group - code copied from standard app and adjusted                                                           
			 * @param {object} oEvent - reassign button click event                                                                                               
			 * @public                                                                                                                                                                       
			 */
			onReassign: function (oEvent) {
				// Initialize the variable storing the number of requests and responses
				this.noofBatchRequest = 0;
				this.noofResponse = 0;
				var oTargetPurGrp = sap.ui.getCore().byId("idTargetPurgGrp");
				var purgGrp = oTargetPurGrp.getValue();
				var materialGrp = this.byId("idTargetMaterialGrp").getValue();

				var oReassignComment = sap.ui.getCore().byId("idReassignComment");
				var sReassignCommentValue = oReassignComment.getValue();

				oReassignComment.attachLiveChange(this.onTemplateInputLiveChange.bind(this));

				// Get the table of selected PRs that the user selects on the PR list page
				var oSelectedItems = this._oPurchaseRequsitionTable.getSelectedContexts();
				if (purgGrp === "" || oSelectedItems.length === 0) {
					oTargetPurGrp.setValueState(ValueState.Error);
				} else if (sReassignCommentValue === "") {
					oReassignComment.setValueState(ValueState.Error);
				} else {
					this.setReassignDialog();
					var oPayload = [];

					for (var iSelectedPRCount = 0; iSelectedPRCount < oSelectedItems.length; iSelectedPRCount++) {

						// Get the Context data of the selected item
						var oContextData = oSelectedItems[iSelectedPRCount].getProperty(oSelectedItems[iSelectedPRCount].getPath());
						// Prepare the Payload to be used to fire the GW call
						oPayload = {
							ProcmtHubPurchaseRequisition: oContextData.ProcmtHubPurchaseRequisition,
							ProcmtHubPurRequisitionItem: oContextData.ProcmtHubPurRequisitionItem,
							ProcurementHubSourceSystem: oContextData.ProcurementHubSourceSystem,
							ProcmtHubPurRequisitionType: oContextData.ProcmtHubPurRequisitionType,
							ProcmtHubPurchasingGroup: oContextData.ProcmtHubPurchasingGroup,
							ProcmtHubPurchasingOrg: oContextData.ProcmtHubPurchasingOrg,
							ProcmtHubPlant: oContextData.ProcmtHubPlant,
							PrmtHbPurReqnItmReassgmtRsn: sReassignCommentValue,
							ProcmtHubTargetPurchasingGroup: purgGrp,
							MaterialGroup: materialGrp
						};
						//Call function import to reassign the purchase requisition
						this.getView().getModel().callFunction("/ReassignPRItems", {
							method: "POST",
							urlParameters: oPayload,
							success: this.successReassignPrItems.bind(this),
							error: this.errorReassignPrItems.bind(this)
						});
						// Increment the variable that tracks the number of requests fired
						this.noofBatchRequest++;

					}
				}
			},

			/**
			 * Handler for purchasing group change- code copied from standard app
			 * @public                                                                                                                                                                       
			 */
			onTargetPurgGroupChange: function () {
				var purgGrp = sap.ui.getCore().byId("idTargetPurgGrp");
				var purgGrpValue = purgGrp.getValue();

				var reassignBtn = this.byId("idReasgnPRItemButton");
				if (purgGrpValue && purgGrpValue.length <= 3) {
					purgGrp.setValueState("None");
					reassignBtn.setEnabled(true);
				} else {
					purgGrp.setValueState("Error");
					reassignBtn.setEnabled(false);
				}

			},
			/**
			 * Success handler for reassigning purchasing group and material group function import call-code copied from standard app
			 * @param {object} oResponse - response from backend                                                                                                
			 * @public                                                                                                                                                                       
			 */
			successReassignPrItems: function (oResponse) {
				this.noofResponse++;
				if (this.noofBatchRequest === this.noofResponse) {
					var results = oResponse.results;
					var oMessageTemplate = new MessageItem({
						type: "{Type}",
						title: "{Title}",
						description: "{Message}"

					});
					var oMessageModel = new JSONModel();

					if (results.length > 1) {
						var that = this;
						oMessageModel.setSizeLimit(results.length);
						oMessageModel.setData(results);

						var oBackButton = new Button({
							icon: sap.ui.core.IconPool.getIconURI("nav-back"),
							visible: false,
							press: function () {
								that.oMessageView.navigateBack();
								this.setVisible(false);
							}
						});

						this.oMessageView = new MessageView({
							showDetailsPageHeader: false,
							itemSelect: function () {
								oBackButton.setVisible(true);
							},
							items: {
								path: "/",
								template: oMessageTemplate
							}
						});

						this.oMessageView.setModel(oMessageModel);

						this.oMessageDialog = new Dialog({
							resizable: true,
							content: this.oMessageView,
							beginButton: new Button({
								press: function () {
									this.getParent().close();
									that.base.getView().getController().refreshAfterReassign();
								},
								text: this.getView().getModel("i18n").getResourceBundle().getText("Close")
							}),
							customHeader: new Bar({
								contentMiddle: [
									new Text({
										text: this.getView().getModel("i18n").getResourceBundle().getText("Messages")
									})
								],
								contentLeft: [oBackButton]
							}),
							contentHeight: "500px",
							contentWidth: "600px",
							verticalScrolling: false
						});
						this.oReassignPurGrpDialog.setBusy(false);
						this.base.getView().getController().onReasgnCancel();
						this.oMessageDialog.open();
					} else if (results.length === 1) {
						this.oReassignPurGrpDialog.setBusy(false);
						this.base.getView().getController().onReasgnCancel();
						var title = results[0].Title;
						var message = results[0].Message;
						if (results[0].Type === "Success") {
							MessageBox.success(title, {
								details: message
							}, {
								onclose: this.base.getView().getController().refreshAfterReassign()
							});
						} else if (results[0].Type === "Error") {
							MessageBox.error(title, {
								details: message
							});
						}
					}

					this._oPurchaseRequsitionTable.removeSelections();
					this.getView().getController().extensionAPI.refreshTable();
				}
			},
			/**
			 * Error handler for reassigning purchasing group and
             * material group function import call-code copied from standard app                                                                                        
			 * @param {object} oResponse - response from backend                                                                                               
			 * @public                                                                                                                                                                       
			 */
			errorReassignPrItems: function (oResponse) {
				this.noofResponse++;
				if (this.noofBatchRequest === this.noofResponse) {
					this.oReassignPurGrpDialog.setBusy(false);
					try {
						MessageBox.error(JSON.parse(oResponse.responseText).error.message.value);
					} catch (e) {
						var oResourceModel = this.getOwnerComponent().getAppComponent().getModel("i18n").getResourceBundle();
						MessageBox.error(oResourceModel.getText("ReassignError"));
					}

				}
			},
			/**
			 * Material group value help                                                                                                                                  
			 * @param {object} oEvent - F4 help action                                                                                               
			 * @public                                                                                                                                                                       
			 */
			onMaterialGrpValueHelpRequest: function (oEvent) {
				this.oReassignPurGrpDialog = sap.ui.getCore().byId("idReassignPurchaseGroup");
				this.oReassignPurGrpDialog.setBusy(true);

				this.ValueHelpDialog = new ValueHelpDialog({
					title: "{i18n>MaterialGroup}",
					basicSearchText: "",
					supportRanges: false,
					supportRangesOnly: false,
					supportMultiselect: false,
					cancel: this.onVHClose.bind(this),
					filterMode: true
				});
				this.getView().addDependent(this.ValueHelpDialog);
				var oModel = this.getView().getModel();
				var mParameters = {};
				mParameters.success = this.onSuccessMaterialGroupVH.bind(this);
				mParameters.error = this.onErrorMaterialGroupVH.bind(this);
				oModel.read("/C_ProcmtHubProductGroupVH", mParameters);
			},

			/*
			 * Error handler for material group value help                                           
			 * @param {object} oData
			 * @param {object} results
			 * @public                                                                                                                                                                       
			 */
			onErrorMaterialGroupVH: function (oData, results) {
				this.oReassignPurGrpDialog.setBusy(false);
				try {
					MessageBox.error(JSON.parse(oData.responseText).error.message.value);
				} catch (e) {
					var oResourceModel = this.getView().getController().getModel("i18n").getResourceBundle();
					MessageBox.error(oResourceModel.getText("PurgGroupErr"));
				}
			},
			/*
			 * Success handler for material group value help                                                                                                                                
			 * @param {object} oData
			 * @param {object} results
			 * @public                                                                                                                                                                       
			 */
			onSuccessMaterialGroupVH: function (oData, results) {
				this.oReassignPurGrpDialog.setBusy(false);
				var oResourceModel = this.getView().getController().getModel("i18n").getResourceBundle();
				var sGroupCol = oResourceModel.getText("MaterialGroup");
				var sGroupNameCol = oResourceModel.getText("MaterialGroupName");
				var sSearchGroup = oResourceModel.getText("SearchGroup");
				var oColModel = new JSONModel({
					cols: [{
						label: sGroupCol,
						template: "ProcmtHubProductGroup"
					}, {
						label: sGroupNameCol,
						template: "ProductGroupName"
					}]
				});
				this.aResults = oData.results;
				this.ValueHelpDialog.getTable().setModel(oColModel, "columns");
				this.oRowsModel = new JSONModel(oData.results);
				this.ValueHelpDialog.getTable().setModel(this.oRowsModel);
				var oTable = this.ValueHelpDialog.getTable();
				oTable.bindAggregation("rows", "/", function (sId, oContext) {
					var aCols = oTable.getModel("columns").getData().cols;

					return new ColumnListItem({
						cells: aCols.map(function (column) {
							var colname = column.template;
							return new Label({
								text: "{" + colname + "}"
							});
						})
					});
				});
				var oFilterBar = new FilterBar({
					advancedMode: true,
					filterBarExpanded: false,
					showGoOnFB: !sap.ui.Device.system.phone

				});
				if (oFilterBar.setBasicSearch) {
					oFilterBar.setBasicSearch(new SearchField({
						showSearchButton: sap.ui.Device.system.phone,
						placeholder: sSearchGroup

					}));
				}

				this.ValueHelpDialog.setFilterBar(oFilterBar);
				var oFilter = this.ValueHelpDialog.getFilterBar();
				oFilter.attachSearch(this.onSearchMaterialGroup, this);
				oFilter.attachFilterChange(this.onSearchMaterialGroup, this);
				oTable.attachRowSelectionChange(oData, this.onRowSelectionChange, this);

				this.ValueHelpDialog.open();
			},
			/*
			 * Handler for search feature in material group value help                                                                                                                                
			 * @param {object} oEvent - event when user enters some search value
			 * @public                                                                                                                                                                       
			 */
			onSearchMaterialGroup: function (oEvent) {
				this.oRowsModel.setData(this.aResults);
				var oSearchVal;
				var oFilterBar = oEvent.getSource();
				var oSearchValAct = oFilterBar.getBasicSearchValue();
				oSearchVal = oSearchValAct.toUpperCase();
				var oTableModel = this.oRowsModel.getData();

				if (oSearchVal === "") {
					this.oRowsModel.setData(this.aResults);
					return;
				}
				oTableModel = oTableModel.filter(function (obj) {
					return obj.ProcmtHubProductGroup.includes(oSearchVal) || obj.ProductGroupName.toUpperCase().includes(oSearchVal);
				});
				this.oRowsModel.setData(oTableModel);
			},
			/*
			 * Handler for selecting material group from value help table                                                                 
			 * @param {object} oEvent - event when user selects value from value help
			 * @public                                                                                                                                                                       
			 */
			onRowSelectionChange: function (oEvent) {
				var oValue = oEvent.getParameter("rowContext").getObject().ProcmtHubProductGroup;
				var oMaterialGroup = this.byId("idTargetMaterialGrp");
				oMaterialGroup.setValue(oValue);
				oMaterialGroup.fireLiveChange();
				this.ValueHelpDialog.close();
				this.ValueHelpDialog.destroy();
				this.ValueHelpDialog = "";
			},

			/**
			 * On closing material group value help    
			 * @public                                                                                                                                                                       
			 */
			onVHClose: function () {
				this.ValueHelpDialog.close();
				this.ValueHelpDialog.destroy();
				this.ValueHelpDialog = "";
			},
			/**
			 * Set intance of reassign purchasing/material group dialog    
			 * @public                                                                                                                                                                       
			 */
			setReassignDialog: function () {
				var oReassignPurGrpDialog;
				if (!oReassignPurGrpDialog) {
					oReassignPurGrpDialog = sap.ui.getCore().byId("idReassignPurchaseGroup");
				}
				this.oReassignPurGrpDialog = oReassignPurGrpDialog;
			},

			/*
			 * Open document history dialog
			 * @param {object} oEvent Event object when user clicks on Document history icon
			 */
			openDocumentHistoryDialog: function (oEvent) {
				DocumentHistoryHelper.openDocumentHistoryDialog(oEvent, this.getView(), ApplicationType.MPRC_ITEM);
			},

			/*
			 * Return Delivery Status Icon similar to traffic Light.Formatter is used.
			 * @param {string} sDeliveryStatus 
			 * @returns {string} Icon type based on Delivery Status
			 */
			setDeliveryStatusIconFormatter: function (sDeliveryStatus) {
				return Formatter.setDeliveryStatusIconFormatter(sDeliveryStatus);
			},
			/*
			 * This method handles live change event of currency Input control, only for removing input value 
			 * @param {object} Event Controller 
			 */
			onCurrencyInputLiveChange: function (oEvent) {
				this.oTableRowSelected = oEvent.getSource();
				if (this.oTableRowSelected.getValue().length === 0) {
					var sBindingPath = this.oTableRowSelected.getBindingContext().sPath;
					this._oModel.setProperty(sBindingPath + "/LocalAmount", "");
					this.oTableRowSelected.setValueState("None");
				}
			},
			/*
			 * Formatter function for Delivery Status text 
			 * @param {string}  Delivery Status Description
			 */
			setDeliveryStatusText: function (sDeliveryStatusText) {
				return sDeliveryStatusText;
			},
			/*
			 * Return color of Status Text. Formatter is used
			 * @param {string}  Delivery Status
			 * @returns {string} Icon Color String
			 */
			setDeliveryStateFormatter: function (sDeliveryStatus) {
				return Formatter.setDeliveryStateFormatter(sDeliveryStatus);
			},
			/*
			 * This method clears the search term for Currency Value Help on dialog close
			 * @param {Object} OEvent
			 */
			onValueHelpDialogClose: function (oEvent) {
				this.oTableRowSelected = null; // destroy the refernce for the selected row 
				oEvent.getSource().getBinding("items").filter({});
			},
			/*
			 * This method handles search term based on currency Code
			 * @param {Object} OEvent
			 */
			onValueHelpDialogSearch: function (oEvent) {
				var sValue = oEvent.getParameter("value");
				var oFilter = new Filter("Currency", FilterOperator.Contains, sValue.toUpperCase()); // supports only uppercase value
				oEvent.getSource().getBinding("items").filter([oFilter]);
			},
			/*
			 * This method handles Currency selection from Value help and fires function import call
			 * @param {Object} OEvent
			 */
			onValueHelpDialogSelect: function (oEvent) {
				var oSelectedItem = oEvent.getParameter("selectedItem");
				if (!oSelectedItem) {
					return;
				}
				var oFunctionImportParameter = {
					LocalCurrency: oSelectedItem.getTitle()
				};
				// a function import call to set local Amount Data
				this._oModel.callFunction("/SaveLocalCurrency", {
					method: "POST",
					urlParameters: oFunctionImportParameter,
					success: (function (oSuccessResponse) {
						if (oSuccessResponse) {
							// Refresh table bindings to show table rows with updated local amount
							this._oPurchaseRequsitionTable.getBinding("items").refresh();
						}
					}).bind(this),
					error: function (oErrorResponse) {
						try {
							MessageBox.error(JSON.parse(oErrorResponse.responseText).error.message.value);
						} catch (e) {
							MessageBox.error(this._oResourceBundle.getText("AmountConversionError"));
						}
					}.bind(this)
				});
				// Clearing up the Value help Search 
				oEvent.getSource().getBinding("items").filter({});
			},
			/*
			 * This method is used for opening Opening Currency Value help dialog
			 * @param {Object} OEvent
			 */
			handleDisplayCurrencyDialog: function (oEvent) {
				this.oTableRowSelected = oEvent.getSource();
				// Currency Value help is fixed Key-Value Pair, we can create a dialog once with binding and reuse the instance 	
				if (!this._oLocalCurrencyValueLimitDialog) {
					this._oLocalCurrencyValueLimitDialog = sap.ui.xmlfragment("curencyValueDialog",
						"vwks.nlp.s2p.mm.prcentral.manage.changes.fragments.CurrencyValueHelpDialog", this);
					this.getView().addDependent(this._oLocalCurrencyValueLimitDialog);
					this._oLocalCurrencyValueLimitDialog.open();
				} else {
					this._oLocalCurrencyValueLimitDialog.open();
				}
			},
			/*
			 * Event handler for Notes button press
			 * @param {Object} OEvent
			 */
			handleNotesButtonPress: function (oEvent) {
				var oContextObject = oEvent.getSource().getBindingContext().getObject(),
					aFilters = [],
					oDocumentNumberFilter = new Filter({
						path: "DocumentNumber",
						operator: FilterOperator.EQ,
						value1: oContextObject.ProcmtHubPurchaseRequisition
					}),
					oDocumentItemFilter = new Filter({
						path: "DocumentItem",
						operator: FilterOperator.EQ,
						value1: oContextObject.ProcmtHubPurRequisitionItem
					}),
					oSourceSystemFilter = new Filter({
						path: "SourceSystem",
						operator: FilterOperator.EQ,
						value1: oContextObject.ProcurementHubSourceSystem
					});
				aFilters.push(oDocumentNumberFilter, oDocumentItemFilter, oSourceSystemFilter);
				if (!this.oNotesDialog) {
					Fragment.load({
						name: "vwks.nlp.s2p.mm.prcentral.manage.changes.fragments.NotesDialog",
						controller: this
					}).then(function (oDialog) {
						this.oNotesDialog = oDialog;
						this.getView().addDependent(this.oNotesDialog);
						this.oNotesDialog.open();
					}.bind(this));
				} else {
					this.oNotesDialog.open();
				}
				this.handleTableBinding(aFilters);
			},
			/*
			 * Event handler for notes dialog table binding
			 * @param {Object} aFilters - filters to be passed in calling entity set
			 */
			handleTableBinding: function (aFilters) {
				var oBusyDialog = new BusyDialog();
				var oView = this.getView();
				oBusyDialog.open();
				oView.getModel().read(
					"/xVWKSxNLP_PR_C_NOTE_DETAIL", {
						filters: aFilters,
						success: function (oData, oResponse) {
							oView.getModel("NotesModel").setData(oData.results);
							oBusyDialog.close();
						},
						error: function (oError) {
							if (oError.responseText) {
								var oMessage = JSON.parse(oError.responseText);
								MessageBox.error(oMessage.error.message.value);
							}
							oBusyDialog.close();
						}
					}
				);
			},
			/*
			 * Event handler for closing Notes dialog
			 */
			handleNotesDialogClose: function () {
				this.oNotesDialog.close();
				this._oView.getModel("NotesModel").setData();
			},

			/**
			 * Return tooltip for supplier status. Formatter is used.
			 * @param {string} sSupplierOverallStatus supplier overall status code
			 * @return {string} tooltip text
			 * @public
			 */
			 getSupplierOverallStatusTooltip: function (sSupplierOverallStatus) {
				return ReuseFormatter.getSupplierOverallStatusTooltip(sSupplierOverallStatus, this._oResourceBundle);
			},
			
			/**
			 * Formatter for Supplier Overall Status Icon
			 * @param {string} sSupplierOverallStatus supplier overall status code
			 * @return {string} icon src
			 * @public
			 */
			getSupplierOverallStatusIcon: function (sSupplierOverallStatus) {
				return ReuseFormatter.getSupplierOverallStatusIcon(sSupplierOverallStatus);
			},

			/**
			 * Formatter for Supplier Overall Status Icon Color
			 * @param {string} sSupplierOverallStatus supplier overall status code
			 * @return { sap.ui.core.IconColor} icon color
			 * @public
			 */
			getSupplierOverallStatusState: function (sSupplierOverallStatus) {
				return ReuseFormatter.getSupplierOverallStatusState(sSupplierOverallStatus);
			},

			/**
			 * Supplier Overall Status press event handler.
			 * @param {sap.ui.base.Event} oEvent press event
			 */
			onSupplierOverallStatusPress: function (oEvent) {
				var oSupplierOverallStatusIcon = oEvent.getSource();
				var oPRContext = oSupplierOverallStatusIcon.getBindingContext();
				this.oSupplierStatuses.loadPopover(oSupplierOverallStatusIcon)
					.then(function () {
						this.oSupplierStatuses.setBusy(true);
						return this.oSupplierStatuses.loadSupplierStatus(oPRContext);
					}.bind(this))
					.then(function (oData) {
						this.oSupplierStatuses.setSupplierStatusData(oData);
						this.oSupplierStatuses.setBusy(false);
					}.bind(this))
					.catch(function (oError) {
						this.oSupplierStatuses.setBusy(false);
						if (JSON.parse(oError.responseText)) {
							MessageBox.error(JSON.parse(oError.responseText).error.message.value);
						}
					}.bind(this));
			},

			/**
			 * Supplier press event handler.
			 * @param {sap.ui.base.Event} oEvent press event
			 */
			onSupplierNamePress: function (oEvent) {
				var oSupplierNameLink = oEvent.getSource();
				var oPRContext = oSupplierNameLink.getBindingContext();
				this.oSupplierQuickView.loadQuickView(oSupplierNameLink)
					.then(function () {
						this.oSupplierQuickView.setBusy(true);
						return this.oSupplierQuickView.loadSupplierData(oPRContext);
					}.bind(this))
					.then(function (oData) {
						this.oSupplierQuickView.setSupplierData(oData);
						this.oSupplierQuickView.setBusy(false);
					}.bind(this))
					.catch(function (oError) {
						this.oSupplierQuickView.setBusy(false);
						if (JSON.parse(oError.responseText)) {
							MessageBox.error(JSON.parse(oError.responseText).error.message.value);
						}
					}.bind(this));
			},

			/* handler for comment dialog
			 * @param {Object} oEvent - event trigger
			 * @public
			 */
			handleCommentPress: function (oEvent) {
				this._oBindingContext = oEvent.getSource().getParent().getBindingContext();
				if (!this.oCommentDialog) {
					Fragment.load({
						name: "vwks.nlp.s2p.mm.prcentral.manage.changes.fragments.CommentDialog",
						controller: this
					}).then(function (oDialog) {
						this.oCommentDialog = oDialog;
						this.getView().addDependent(this.oCommentDialog);
						this.oCommentDialog.setBindingContext(this._oBindingContext);
						this.oCommentDialog.open();
					}.bind(this));
				} else {
					this.oCommentDialog.open();
				}
			},

			/*
			 * Live comment change
			 * @param {object} oEvent- The event object
			 * @public
			 */
			handleCommentLiveChange: function (oEvent) {
				var oComment = oEvent.getParameter("newValue");
				if (oComment.length > 100) {
					oEvent.getSource().setValueState("Error");
					oEvent.getSource().setValueStateText(this._oResourceBundle.getText("CommentMaxLengthMsg"));
					this.getView().getModel("MPRCSettingsModel").setProperty("/enableCommentSave", false);
				} else {
					oEvent.getSource().setValueState("None");
					oEvent.getSource().setValueStateText("");
					this.getView().getModel("MPRCSettingsModel").setProperty("/enableCommentSave", true);
				}
			},

			/* handler for saving comment
			 * @param {object} oEvent- The event object
			 * @public
			 */
			onSaveComment: function (oEvent) {
				var oPurchaseReqObject = oEvent.getSource().getParent().getBindingContext().getObject();
				this.getView().getModel().callFunction("/AddPRCommentOption", {
					method: "POST",
					urlParameters: {
						ProcmtHubPurchaseRequisition: oPurchaseReqObject.ProcmtHubPurchaseRequisition,
						ProcmtHubPurRequisitionItem: oPurchaseReqObject.ProcmtHubPurRequisitionItem,
						ProcurementHubSourceSystem: oPurchaseReqObject.ProcurementHubSourceSystem,
						Comment: oPurchaseReqObject.xvwksxnlp_comment
					},
					success: this.handleSaveCommentSuccess.bind(this),
					error: this.handleSaveCommentError.bind(this)
				});

			},
			/* Event handler for save comment success
			 * @public
			 */
			handleSaveCommentSuccess: function () {
				MessageToast.show(this._oResourceBundle.getText("CommentSuccessMsg"));
				this._oPurchaseRequsitionTable.getBinding("items").refresh();
				this.onCancelComment();
			},
			/* Event handler for save comment error
			 * @param {object} oError - responce object with an error
			 * @public
			 */
			handleSaveCommentError: function (oError) {
				if (oError.responseText) {
					var sErrorMsg = JSON.parse(oError.responseText).error.message.value;
					MessageBox.error(sErrorMsg, {
						onClose: function () {
							this.onCancelComment();
						}.bind(this)
					});
				}
			},
			/* handler for closing comment dialog
			 * @param {Object} oEvent - event trigger
			 * @public
			 */
			onCancelComment: function () {
				this.oCommentDialog.close();
				this.oCommentDialog.destroy();
				// This is to fix duplicate id issue in fragment
				this.oCommentDialog = undefined;
			},

			/**
			 * Create Purchase Order button press event handler.
			 * @param {sap.ui.base.Event} oEvent press event object
			 */
			onCreatePurchaseOrder: function (oEvent) {
				var oModel = this.getODataModel();
				oModel.setDeferredGroups(["CreatePurchaseOrder"]);
				var aSelectedPRItemsCtx = this._oPurchaseRequsitionTable.getSelectedContexts();
				for (var iSelectedPRCount = 0; iSelectedPRCount < aSelectedPRItemsCtx.length; iSelectedPRCount++) {
					var oSelectedPRItemContext = aSelectedPRItemsCtx[iSelectedPRCount];
					var oContextData = oSelectedPRItemContext.getProperty(oSelectedPRItemContext.getPath());
					var oPayload = {
						"ProcmtHubPurchaseRequisition": oContextData.ProcmtHubPurchaseRequisition,
						"ProcmtHubPurRequisitionItem": oContextData.ProcmtHubPurRequisitionItem,
						"ProcurementHubSourceSystem": oContextData.ProcurementHubSourceSystem
					};
					oModel.callFunction("/PRFoDPOCreate", {
						method: "POST",
						urlParameters: oPayload,
						batchGroupId: "CreatePurchaseOrder"
					});
				}
				oModel.submitChanges({
					batchGroupId: "CreatePurchaseOrder",
					success: this.handleSuccessCreatePO.bind(this),
					error: this.handleErrorCreatePO.bind(this)
				});
			},

			/**
			 * Navigates to the 'Create PO' intermediate screen.
			 * @param {object} oResponse response data
			 */
			handleSuccessCreatePO: function (oResponse) {
				var aFICallResponse = oResponse.__batchResponses[0].__changeResponses;
				if (aFICallResponse.length) {
					var sRequestedGuid = aFICallResponse[0].data.PurReqnFllwOnDocDrftHdrUUID;
					//Navigate to Create PO app
					NavigationHelper.navigateToOutboundTarget(this._oController, "CreatePO", {
						PurReqnFllwOnDocDrftHdrUUID: sRequestedGuid
					});
				}
			},

			/**
			 * Show error message in case of 'PRFoDPOCreate' request is failed.
			 * @param {object} oError error object
			 */
			handleErrorCreatePO: function (oError) {
				try {
					MessageBox.error(JSON.parse(oError.responseText).error.message.value);
				} catch (e) {
					MessageBox.error(this._oResourceBundle.getText("CreatePOError"));
				}
			},

			/* handler for Display Reason Button
			 * @param {Object} oEvent - event trigger
			 */
			handleInActiveActionReason: function (oEvent) {
				var aSelectedPRItems = this._oPurchaseRequsitionTable.getSelectedContexts();
				var oPayload;
				this._oValidateReasonButton.setEnabled(false); //disable button 
				this._oPurchaseRequsitionSmartTable.getTable().setBusy(true); //mark the smart table busy so user is not able to navigate
				var sContactinatedPRitems = "";
				var aPritemNumber = [];
				for (var iSelectedPRCount = 0; iSelectedPRCount < aSelectedPRItems.length; iSelectedPRCount++) {
					var oContextData = aSelectedPRItems[iSelectedPRCount].getProperty(aSelectedPRItems[iSelectedPRCount].getPath());
					sContactinatedPRitems = oContextData.FormattedPurRequisitionItem.replaceAll(" ", "") + "/" + oContextData.ProcurementHubSourceSystem;
					aPritemNumber.push(sContactinatedPRitems);
				}

				oPayload = {
					"PurchaseRequisitions": aPritemNumber.join(";")
				};

				this._oModel.callFunction("/PRDisplayReasonAction", {
					method: "GET",
					urlParameters: oPayload,
					success: this.successDisplayInactiveReason.bind(this),
					error: this.errorDisplayInactiveReason.bind(this)
				});
			},

			/* handler for Display Reason Dialog Close
			 * @param {Object} oEvent - event trigger
			 */
			handleDisplayReasonDialogClose: function () {
				this._oDisplayReasonDialog.close();
				this._oDisplayReasonDialog.destroy();
				this.getView().removeDependent(this._oDisplayReasonDialog);
				this._oDisplayReasonDialog = null;
				this._oValidateReasonButton.setEnabled(true);

			},

			/* Success handler for Display function import
			 * @param {Object} oSuccessResponse Response
			 */
			successDisplayInactiveReason: function (oSuccessResponse) {
				this._oPurchaseRequsitionSmartTable.getTable().setBusy(false);
				this._oView.getModel("DisplayReasonModel").setProperty("/", oSuccessResponse);
				if (!this._oDisplayReasonDialog) {
					this._oDisplayReasonDialog = sap.ui.xmlfragment("DisplayReasonDialog",
						"vwks.nlp.s2p.mm.prcentral.manage.changes.fragments.DisplayInactiveReasonDialog", this);
					this.getView().addDependent(this._oDisplayReasonDialog);
				}
				this._oDisplayReasonDialog.open();
			},

			/* Error handler for Display function import
			 * @param {Object} oErrorResponse Response
			 */
			errorDisplayInactiveReason: function (oErrorResponse) {
				this._oPurchaseRequsitionSmartTable.getTable().setBusy(false);
				this._oValidateReasonButton.setEnabled(true); //In case of error enable the validate reason button
				try {
					MessageBox.error(JSON.parse(oErrorResponse.responseText).error.message.value);
				} catch (e) {
					MessageBox.error(this._oResourceBundle.getText("DisplayReasonError"));
				}

			},

			/**
			 * Handle use comment template 
			 * @param {object} oEvent event object
			 */
			onReassignUseCommentTemplate: function (oEvent) {
				if (!this._oCommentTemplateDialog) {
					Fragment.load({
						name: "vwks.nlp.s2p.mm.prcentral.manage.changes.fragments.CommentTemplatePopover",
						id: "useTemplateFragment",
						controller: this
					}).then(function (oTemplatePopover) {
						this._oCommentTemplateDialog = oTemplatePopover;
						this.getView().addDependent(this._oCommentTemplateDialog);
						this.openTemplatePopover();
					}.bind(this));
				} else {
					this.openTemplatePopover();
				}
			},

			/**
			 * Open comment templates popover
			 * @param {object} oEvent event object
			 */
			openTemplatePopover: function () {
				this.oTemplateName = this.byId("idTemplateName");
				this.oReassignCommentText = sap.ui.getCore().byId("idReassignComment");
				this._oCommentTemplateDialog.open();
				this.oTemplateList = Fragment.byId("useTemplateFragment", "idTemplateSmartList");
				if (this.oTemplateList) {
					this.oTemplateList.setModel(this.oTemplateModel);
				}
			},

			/**
			 * Handle save comment template 
			 * @param {object} oEvent event object
			 */
			onReassignSaveCommentTemplate: function (oEvent) {
				this.oTemplateName = this.byId("idTemplateName");
				this.oReassignCommentText = sap.ui.getCore().byId("idReassignComment");
				this.oReassignCommentText.attachLiveChange(this.onTemplateInputLiveChange.bind(this));

				var sTemplateName = this.oTemplateName.getValue();
				var sTemplateText = this.oReassignCommentText.getValue();
				if (sTemplateName === "" || sTemplateText === "") {
					if (sTemplateName === "") {
						this.oTemplateName.setValueState(ValueState.Error);
					}
					if (sTemplateText === "") {
						this.oReassignCommentText.setValueState(ValueState.Error);
					}
				} else {
					var oTemplateData = {
						"action": "FW",
						"template_name": sTemplateName,
						"text": sTemplateText
					};
					this.oTemplateModel.create("/xVWKSxNLP_PR_C_TEXT_TEMPLATE", oTemplateData, {
						success: function (oData, oResponse) {
							MessageBox.success(JSON.parse(oResponse.headers["sap-message"]).message);
						},
						error: function (oError) {
							try {
								MessageBox.error(JSON.parse(oError.responseText).error.message.value);
							} catch (e) {
								MessageBox.error(this._oResourceBundle.getText("SaveCommentTemplateError"));
							}
						}
					});
				}
			},

			/**
			 * Handle template press on template popover
			 * @param {object} oEvent event object
			 */
			onCommentTemplateItemPress: function (oEvent) {
				var oSelectedTemplateContext = oEvent.getParameter("listItem").getBindingContext();
				this.sSelectedTemplateName = oSelectedTemplateContext.getProperty("template_name");
				this.sSelectedTemplateText = oSelectedTemplateContext.getProperty("text");
				if (oEvent.getSource().getId() === this.oCloseTemplateList.getList().getId()) {
					this.byId("idInputForCloseAction").setValue(this.sSelectedTemplateName);
					sap.ui.getCore().byId("idClosurComment").setValue(this.sSelectedTemplateText);
					this._oCloseCommentTemplateDialog.close();
				} else if (oEvent.getSource().getId() === this.oTemplateList.getList().getId()) {
					if (this.oTemplateName && this.oReassignCommentText) {
						this.oTemplateName.setValue(this.sSelectedTemplateName);
						this.oReassignCommentText.setValue(this.sSelectedTemplateText);
					}
					this._oCommentTemplateDialog.close();
				}

			},

			onCommentTemplateDelete: function (oEvent) {
				var oList = oEvent.getSource();
				var oSelectedTemplate = oList.getBindingContext();
				var sSelectedTemplateGuid = oSelectedTemplate.getProperty("guid");
				MessageBox.confirm(this._oResourceBundle.getText("DeleteTemplateConfirmationText"), {
					title: this._oResourceBundle.getText("Delete"),
					actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
					emphasizedAction: MessageBox.Action.DELETE,
					onClose: function (oAction) {
						if (oAction === MessageBox.Action.DELETE) {
							this.onConfirmTemplateDelete(oList, sSelectedTemplateGuid);
						}
					}.bind(this)
				});
			},

			/**
			 * Handle delete of template upon confirmation 
			 * @param {object} oList Template List object
			 * @param {string} sSelectedItemGuid Template guid
			 */
			onConfirmTemplateDelete: function (oList, sSelectedItemGuid) {
				this.oTemplateModel.remove("/xVWKSxNLP_PR_C_TEXT_TEMPLATE(guid=guid'" + sSelectedItemGuid + "')");
			},

			/**
			 * Handle cancel on template popover
			 */
			onReassignCancelCommentTemplate: function () {
				this._oCommentTemplateDialog.close();
			},

			/**
			 * Handle before rebind on template list in template popover
			 * @param {object} oEvent event object
			 */
			onBeforeRebindTemplateList: function (oEvent) {
				var oActionFilter = new Filter("action", FilterOperator.EQ, "FW");
				var oTableBindingParameters = oEvent.getParameter("bindingParams");
				oTableBindingParameters.filters = [];
				oTableBindingParameters.filters.push(oActionFilter);
			},

			/**
			 * Handle search on template in template popover
			 * @param {object} oEvent event object
			 */
			onReassignCommentTemplateSearch: function (oEvent) {
				// add filter for search
				var sQuery = oEvent.getSource().getValue();
				if (sQuery && sQuery.length > 0) {
					var aFilter = [];
					var oTemplateNameFilter = new Filter("template_name", FilterOperator.Contains, sQuery);
					var oTemplateTextFilter = new Filter("text", FilterOperator.Contains, sQuery);
					var oCombinedTemplateFilter = new Filter({
						filters: [oTemplateNameFilter, oTemplateTextFilter],
						and: false
					});
					aFilter.push(oCombinedTemplateFilter);
				}

				// update list binding
				var oBinding = this.oTemplateList.getList().getBinding("items");
				oBinding.filter(aFilter, "Application");
			},

			/**
			 * Handle live change of template name 
			 * @param {object} oEvent event object
			 */
			onTemplateInputLiveChange: function (oEvent) {
				var oTemplateInput = oEvent.getSource();
				if (oTemplateInput.getValue() === "") {
					oTemplateInput.setValueState(ValueState.Error);
				} else {
					oTemplateInput.setValueState(ValueState.None);
				}
			},

			/**
			 * Handle use comment template on close action popup
			 * @param {object} oEvent event object
			 */
			onClickUseTemplate: function (oEvent) {
				if (!this._oCloseCommentTemplateDialog) {
					Fragment.load({
						name: "vwks.nlp.s2p.mm.prcentral.manage.changes.fragments.CloseCommentTemplatePopover",
						id: "useTemplateFragmentForClose",
						controller: this
					}).then(function (oPopover) {
						this._oCloseCommentTemplateDialog = oPopover;
						this.getView().addDependent(this._oCloseCommentTemplateDialog);
						this._oCloseCommentTemplateDialog.open();
						this.oCloseTemplateList = sap.ui.core.Fragment.byId("useTemplateFragmentForClose", "idTemplateSmartListClose");
						if (this.oCloseTemplateList) {
							this.oCloseTemplateList.setModel(this._oController.getOwnerComponent().getModel("TemplateModel"));
						}
					}.bind(this));
				} else {
					this._oCloseCommentTemplateDialog.open();
					this.oCloseTemplateList = sap.ui.core.Fragment.byId("useTemplateFragmentForClose", "idTemplateSmartListClose");
					if (this.oCloseTemplateList) {
						this.oCloseTemplateList.setModel(this.oTemplateModel);
					}
				}
			},

			/**
			 * Handle save comment template 
			 * @param {object} oEvent event object
			 */
			onCloseSaveCommentTemplate: function (oEvent) {
				var oClosureComment = sap.ui.getCore().byId("idClosurComment");
				var sTemplateName = this.byId("idInputForCloseAction").getValue();
				var sTemplateText = oClosureComment.getValue();
				oClosureComment.attachLiveChange(this.onTemplateInputLiveChange.bind(this));
				if (sTemplateName === "" || sTemplateText === "") {
					if (sTemplateName === "") {
						this.byId("idInputForCloseAction").setValueState(ValueState.Error);
					}
					if (sTemplateText === "") {
						oClosureComment.setValueState(ValueState.Error);
					}
				} else {
					var oTemplateData = {
						"action": "CL",
						"template_name": sTemplateName,
						"text": sTemplateText
					};
					this.oTemplateModel.create("/xVWKSxNLP_PR_C_TEXT_TEMPLATE", oTemplateData, {
						success: function (oData, oResponse) {
							MessageBox.success(JSON.parse(oResponse.headers["sap-message"]).message);
						},
						error: function (oError) {
							try {
								MessageBox.error(JSON.parse(oError.responseText).error.message.value);
							} catch (e) {
								MessageBox.error(this._oResourceBundle.getText("SaveCommentTemplateError"));
							}
						}
					});
				}
			},

			/**
			 * Handle cancel on template popover
			 */
			onCloseCancelCommentTemplate: function () {
				this._oCloseCommentTemplateDialog.close();
			},

			/**
			 * Handle before rebind on template list in template popover
			 * @param {object} oEvent event object
			 */
			onBeforeRebindTemplateListForClose: function (oEvent) {
				var oActionFilter = new Filter("action", FilterOperator.EQ, "CL");
				var oTableBindingParameters = oEvent.getParameter("bindingParams");
				oTableBindingParameters.filters = [];
				oTableBindingParameters.filters.push(oActionFilter);
			},

			/**
			 * Handle search on template in template popover
			 * @param {object} oEvent event object
			 */
			onCloseCommentTemplateSearch: function (oEvent) {
				// add filter for search
				var sQuery = oEvent.getSource().getValue();
				if (sQuery && sQuery.length > 0) {
					var aFilter = [];
					var oTemplateNameFilter = new Filter("template_name", FilterOperator.Contains, sQuery);
					var oTemplateTextFilter = new Filter("text", FilterOperator.Contains, sQuery);
					var oCombinedTemplateFilter = new Filter({
						filters: [oTemplateNameFilter, oTemplateTextFilter],
						and: false
					});
					aFilter.push(oCombinedTemplateFilter);
				}

				// update list binding
				var oBinding = this.oCloseTemplateList.getList().getBinding("items");
				oBinding.filter(aFilter, "Application");
			}

		}));
	});