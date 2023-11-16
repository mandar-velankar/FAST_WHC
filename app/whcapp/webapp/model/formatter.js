sap.ui.define([
	'sap/ui/core/format/NumberFormat',
	'sap/ui/core/format/DateFormat'
], function (NumberFormat,DateFormat) {
	"use strict";

	const floatInstance = NumberFormat.getFloatInstance({
		maxFractionDigits: 2
	});

    const percentageInstance = NumberFormat.getPercentInstance({
        decimals: 1
	});

	const currencyInstance = NumberFormat.getCurrencyInstance();

    const integerInstance = NumberFormat.getIntegerInstance();

	return {
		/**
		 * Rounds the currency value to 2 digits
		 *
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		currencyValue : function (sValue, currency) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2) + " " + currency;
		},

		formatPercentage: function(value){
			if(!value) return;
			return percentageInstance.format(value / 100);
		},

        parsePercentage: function (value) {
            if(!value) return;
			return percentageInstance.parse(value);
        },

        formatInteger: function(value){
			if(!value) return;
			return integerInstance.format(value);
		},

		formatFloat: function(value){
			if(!value) return;
			return floatInstance.format(value);
		},

		parseFloat: function(value){
			if(!value) return;
			return floatInstance.parse(value);
		},

		formatCurrency: function(value){
			return currencyInstance.format(value);
		},

		parseCurrency: function(value){
			if(!value) return;
			return currencyInstance.parse(value);
		},

		formatDate: function(date, pattern){
			return DateFormat.getDateInstance({pattern: pattern, UTC: true}).format(date);
		},

		parseDate: function(date, pattern){
			return DateFormat.getDateInstance({pattern: pattern, UTC: true}).parse(date);
		},

		formatText: function (value) {
			return parseInt(value);
		},
		toUpperCamelCase: function(str) {
			return str.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
		},
		truncToTwoDecimalPlaces: function(number) {
			const factor = 100; // 10^2 for two decimal places
			return Math.trunc(number * factor) / factor;
		}
	};
});