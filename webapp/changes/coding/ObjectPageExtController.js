/*
 * Copyright (C) 2009-2020 SAP SE or an SAP affiliate company. All rights reserved.
 * @controller Name:sap.suite.ui.generic.template.ObjectPage.view.Details,
 * @viewId:ui.s2p.mm.extpr.manage.s1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_ExtPurchaseRequisitionItem
 */
sap.ui.define([
		"sap/ui/core/mvc/ControllerExtension",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/Fragment",
		"sap/m/MessageBox",
		"vwks/nlp/s2p/mm/prcentral/manage/changes/utils/Constants",
		"sap/m/MessageToast",
		"vwks/nlp/s2p/mm/reuse/lib/util/NavigationHelper",
		"vwks/nlp/s2p/mm/reuse/lib/util/Constants",
		"vwks/nlp/s2p/mm/reuse/lib/util/Formatter",
		"vwks/nlp/s2p/mm/reuse/lib/supplierStatus/SupplierStatuses"
	],
	function (
		ControllerExtension,
		JSONModel,
		Fragment,
		MessageBox,
		Constants,
		MessageToast,
		NavigationHelper,
		ReuseConstants,
		ReuseFormatter,
		SupplierStatuses
	) {
		"use strict";
		return ControllerExtension.extend("vwks.nlp.s2p.mm.prcentral.manage.ObjectPageExtController", {

			override: {
				/**
				 * Extending onInit life cycle method in adaptation app
				 */
				onInit: function () {
					this._createModel();
					//i18n Resource model
					var oi18nModel = this.getView().getController().getOwnerComponent().getModel("i18n");
					if (oi18nModel) {
						this._oResourceBundle = oi18nModel.getResourceBundle();
					}
					this.getView().getController().extensionAPI.attachPageDataLoaded(this.bindDocumentHistory.bind(this));

					this.oSupplierStatuses = new SupplierStatuses(this.getView(), this._oResourceBundle);
				}
			},
			
			/**
			 * Create view model.
			 * @public
			 */
			_createModel: function () {
				this._oMPRCSettingsModel = new JSONModel({
					enableCommentSave: true
				});
				this.getView().setModel(this._oMPRCSettingsModel, "MPRCSettingsModel");
			},

			/**
			 * Bind Document History composite control.
			 */
			bindDocumentHistory: function () {
				var oDocHistoryData = {
					items: [{
						key: "HI",
						text: this._oResourceBundle.getText("HeaderAndItemFilterText")
					}, {
						key: "I",
						text: this._oResourceBundle.getText("ItemFilterText")
					}]
				};
				var oDocHistoryModel = new JSONModel(oDocHistoryData);
				this.byId("idDocHistorySection").setModel(oDocHistoryModel, "docHistory");
				this.byId("idDocumentHistory").loadDocumentHistory();
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
				this.getView().getModel().refresh();
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
			 * PFO link press event handler.
			 * @param {sap.ui.base.Event} oEvent press event object
			 */
			onPFOLinkPress: function (oEvent) {
				var oPurReq = this.getView().getBindingContext().getObject();

				var oParams = {
					Document: oPurReq.ProcmtHubPurchaseRequisition,
					DocumentType: Constants.PR_DOC_TYPE,
					SourceSystem: oPurReq.ProcurementHubSourceSystem,
					DocumentGuid: ReuseConstants.INITIAL_GUID
				};
				NavigationHelper.navigateToExternalApp(this.getView().getController(), "PFO", null, oParams, true);
			}
		});
	});