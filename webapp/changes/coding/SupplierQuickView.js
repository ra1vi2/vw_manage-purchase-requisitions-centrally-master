sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment",
	"vwks/nlp/s2p/mm/prcentral/manage/changes/utils/Constants"
], function (JSONModel, Fragment, Constants) {
	"use strict";

	var SupplierQuickView = function (oView, oResourceBundle) {
		this._oView = oView;
		this._oResourceBundle = oResourceBundle;
	};
	
	/**
	 * Set or unset popover busy state.
	 * @param {boolean} bBusy true - set busy state, false - remove busy state
	 * @public
	 */
	SupplierQuickView.prototype.setBusy = function (bBusy) {
		this.oSupplierQuickView.setBusy(bBusy);
	};
	
	/**
	 * Load and open popover.
	 * @param {sap.ui.core.Icon} oSupplierLink pressed link
	 * @return {Promise|sap.m.Popover} Promise object
	 * @public
	 */
	SupplierQuickView.prototype.loadQuickView = function (oSupplierLink) {
		if (!this.oSupplierQuickView) {
			return Fragment.load({
				name: "vwks.nlp.s2p.mm.prcentral.manage.changes.fragments.SupplierQuickView",
				controller: this
			}).then(function (oQuickView) {
				this.oSupplierQuickView = oQuickView;
				this.oSupplierModel = new JSONModel();
				this.oSupplierQuickView.setModel(this.oSupplierModel, "supplier");
				this._oView.addDependent(this.oSupplierQuickView);
				this.oSupplierQuickView.openBy(oSupplierLink);
				return oQuickView;
			}.bind(this));
		} else {
			this.oSupplierQuickView.openBy(oSupplierLink);
			this.oSupplierModel.setProperty("/data", []);
			return Promise.resolve();
		}
	};
	
	/**
	 * Set loaded data to the quick view model.
	 * @param {object} oSupplierData supplier data
	 * @public
	 */
	SupplierQuickView.prototype.setSupplierData = function (oSupplierData) {
		var aSupplierAddress = Constants.SUPPLIER_ADDRESS_FIELDS;
		var sAddress = aSupplierAddress.reduce(function (sRes, sField) {
			var sAddressPart = oSupplierData[sField] ? oSupplierData[sField] + "\n" : "";
			return sAddressPart + sRes;
		}, "");
		
		var aQuickViewData = [{
			label: this._oResourceBundle.getText("SupplierNameLabel"),
			value: oSupplierData.Supplier,
			link: oSupplierData.SupplierInfoNavLink,
			type: "link"
		}, {
			label: this._oResourceBundle.getText("DUNSNumberLabel"),
			value: oSupplierData.DUNSNumber,
			type: "text"
		}, {
			label: this._oResourceBundle.getText("AddressLabel"),
			value: sAddress,
			type: "text"
		}];
		this.oSupplierModel.setProperty("/supplierName", oSupplierData.SupplierName);
		this.oSupplierModel.setProperty("/supplierNum", oSupplierData.Supplier);
		this.oSupplierModel.setProperty("/data", aQuickViewData);
		this.oSupplierModel.refresh();
	};

	/**
	 * Return Promise that requests supplier data.
	 * @param {sap.ui.model.Context} oPRContext purchase requisition context
	 * @return {Promise} Promise object
	 * @public
	 */
	SupplierQuickView.prototype.loadSupplierData = function (oPRContext) {
		return new Promise(function (resolve, reject) {
			var sPath = oPRContext.getPath() + "/to_SupplierInfo";
			this._oView.getModel().read(sPath, {
				success: function (oData) {
					resolve(oData);
				},
				error: function (oError) {
					reject(oError);
				}
			});
		}.bind(this));
	};

	return SupplierQuickView;
});