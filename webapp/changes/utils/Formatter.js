sap.ui.define([
], function () {
	"use strict";
	return {
		/*
		 * Formatter function determine color of Status Text
		 * @param {string}  Delivery Status
		 * @returns {string} Icon Color String
		 */
		setDeliveryStateFormatter: function (sDeliveryStatus) {
			var sDeliveryStatusColor;
			switch (sDeliveryStatus) {
			case "01":
				sDeliveryStatusColor = "Success"; //Green Fully open 
				break;
			case "02":
				sDeliveryStatusColor = "Warning"; // yellow Partially Open 
				break;
			case "03":
				sDeliveryStatusColor = "Error"; // Red Fully Ordered 
				break;
			default:
				sDeliveryStatusColor = "None"; // Neutral Status
				break;
			}
			return sDeliveryStatusColor;
		},

		/*
		 * Delivery Status Icon Formatter similar to traffic Light 
		 * @param {string} sDeliveryStatus 
		 * @returns {string} Icon type based on Delivery Status
		 */
		setDeliveryStatusIconFormatter: function (sDeliveryStatus) {
			var sStatusIconType;
			switch (sDeliveryStatus) {
			case "01":
				sStatusIconType = "sap-icon://status-negative"; // Fully Open
				break;
			case "02":
				sStatusIconType = "sap-icon://status-critical"; // Partially Open
				break;
			case "03":
				sStatusIconType = "sap-icon://status-positive"; // Fully Ordered
				break;
			default:
				sStatusIconType = "";
				break;
			}
			return sStatusIconType;
		}
	};
});